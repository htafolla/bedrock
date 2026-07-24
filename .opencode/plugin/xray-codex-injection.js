/**
 * Consumer runtime compat shim from prior 0xRay releases (1-line min per Scope Rule; xray codex injection + .xray fallbacks).
 */
import * as fs from "fs";
import * as path from "path";
import { getOrCreateLogger } from "./plugin-logger.js";
import { resolveStateDir, importSystemPromptGenerator, loadXrayComponents, getProcessorManager, getXrayStateManager, getFeaturesConfigLoader, getDetectTaskType, getSystemPromptGenerator, } from "./plugin-modules.js";
import { getFrameworkIdentity, classifyTaskType, isWriteEditOperation, isPublishOperation, resolveAgentName, registerAllProcessors, registerAfterPostProcessors, logPreProcessorResults, logPostProcessorResults, logTestAutoCreationResult, spawnPromise, } from "./plugin-helpers.js";
import { runEnforcerQualityGate } from "./plugin-quality-gate.js";
import { evaluatePostToolSpawn, evaluatePreToolGate, isSubagentTool, loadDelegationGateFeatures, } from "../nucleus/delegation-gate.js";
import { readFileSync } from "fs";
import { join } from "path";
// Re-export all public API for test compatibility
export { classifyTaskType } from "./plugin-helpers.js";
export { validateModulePath } from "./plugin-modules.js";
export { extractCodexMetadata, createCodexContextEntry, formatCodexContext } from "./plugin-codex-context.js";
export { isWriteEditOperation, isPublishOperation, TOOL_AGENT_MAP, registerAllProcessors, registerAfterPostProcessors, resolveAgentName, getFrameworkVersion, getFrameworkIdentity } from "./plugin-helpers.js";
export { runEnforcerQualityGate } from "./plugin-quality-gate.js";
export { PluginLogger } from "./plugin-logger.js";
const INFERENCE_TUNE_INTERVAL = 100;
let _openCodeToolCallCount = 0;
let _lastTuneToolCallCount = 0;
export default async function xrayCodexPlugin(input) {
    const { directory: inputDirectory } = input;
    const directory = inputDirectory || process.cwd();
    return {
        "experimental.chat.system.transform": async (_input, output) => {
            try {
                await importSystemPromptGenerator();
                let leanPrompt = getFrameworkIdentity();
                const _systemPromptGenerator = getSystemPromptGenerator();
                if (_systemPromptGenerator) {
                    leanPrompt = await _systemPromptGenerator({
                        showWelcomeBanner: true,
                        showCodexContext: false,
                        enableTokenOptimization: true,
                        maxTokenBudget: 8192,
                        showCriticalTermsOnly: true,
                        showEssentialLinks: true,
                    });
                }
                if (output.system && Array.isArray(output.system)) {
                    output.system = [leanPrompt];
                }
            }
            catch (error) {
                const logger = await getOrCreateLogger(directory);
                logger.error("System prompt injection failed:", error);
                const fallback = getFrameworkIdentity();
                if (output.system && Array.isArray(output.system)) {
                    output.system = [fallback];
                }
            }
        },
        "tool.execute.before": async (input, output) => {
            const logger = await getOrCreateLogger(directory);
            logger.log(`🚀 TOOL EXECUTE BEFORE HOOK FIRED: ${input.tool}`);
            logger.log(`📥 Full input: ${JSON.stringify(input)}`);
            await loadXrayComponents();
            const _featuresConfigLoader = getFeaturesConfigLoader();
            const _detectTaskType = getDetectTaskType();
            if (_featuresConfigLoader && _detectTaskType) {
                try {
                    const config = _featuresConfigLoader.loadConfig();
                    if (config.model_routing?.enabled) {
                        const taskType = _detectTaskType(input.tool);
                        const routing = taskType !== "unknown"
                            ? config.model_routing.task_routing?.[taskType]
                            : undefined;
                        if (routing?.model) {
                            output.model = routing.model;
                            logger.log(`Model routed: ${input.tool} → ${taskType} → ${routing.model}`);
                        }
                    }
                }
                catch (e) {
                    logger.error("Model routing error", e);
                }
            }
            const { tool, args } = input;
            const qualityGateResult = await runEnforcerQualityGate(input, logger);
            if (!qualityGateResult.passed) {
                logger.error(`🚫 Quality gate failed: ${qualityGateResult.violations.join(", ")}`);
                throw new Error(`ENFORCER BLOCKED: ${qualityGateResult.violations.join("; ")}`);
            }
            logger.log(`✅ Quality gate passed for ${tool}`);
            const features = loadDelegationGateFeatures(directory);
            let sessionId = process.env.GROK_SESSION_ID ?? null;
            try {
                const boot = JSON.parse(readFileSync(join(directory, ".xray", "state", "session-boot.json"), "utf8"));
                sessionId = boot.sessionId ?? sessionId;
            }
            catch {
                /* no session boot */
            }
            const delegationGate = evaluatePreToolGate(tool, (args ?? {}), {
                projectRoot: directory,
                sessionId,
                features,
                host: "opencode",
            });
            if (!delegationGate.allow) {
                logger.error(`🚫 Delegation gate: ${delegationGate.reason}`);
                throw new Error(`DELEGATION GATE: ${delegationGate.reason}`);
            }
            if (isWriteEditOperation(tool)) {
                const _ProcessorManager = getProcessorManager();
                const _XrayStateManager = getXrayStateManager();
                if (!_ProcessorManager || !_XrayStateManager) {
                    logger.error("ProcessorManager or XrayStateManager not loaded");
                    return;
                }
                let stateManager;
                let processorManager;
                const globalState = globalThis.xrayStateManager;
                if (globalState) {
                    logger.log("🔗 Connecting to booted 0xRay framework");
                    stateManager = globalState;
                }
                else {
                    logger.log("🚀 0xRay framework not booted, initializing...");
                    stateManager = new _XrayStateManager(await resolveStateDir(directory));
                    globalThis.xrayStateManager = stateManager;
                }
                processorManager = stateManager.get("processor:manager") ?? null;
                if (!processorManager) {
                    logger.log("⚙️ Creating and registering processors...");
                    processorManager = new _ProcessorManager(stateManager);
                    registerAllProcessors(processorManager);
                    stateManager.set("processor:manager", processorManager);
                    logger.log("✅ Processors registered successfully");
                }
                else {
                    logger.log("✅ Using existing processor manager");
                }
                try {
                    logger.log(`▶️ Executing pre-processors for ${tool}...`);
                    const preProcessorInput = {
                        tool,
                        args: args,
                        context: {
                            directory,
                            operation: "tool_execution",
                            filePath: args?.filePath,
                        },
                    };
                    const result = await processorManager.executePreProcessors(preProcessorInput);
                    logPreProcessorResults(result, logger);
                }
                catch (error) {
                    logger.error(`💥 Pre-processor execution error`, error);
                }
                try {
                    logger.log(`▶️ Executing post-processors for ${tool}...`);
                    logger.log(`📝 Post-processor args: ${JSON.stringify(args)}`);
                    const agentName = resolveAgentName(input);
                    const postProcessorContext = {
                        directory,
                        operation: tool,
                        filePath: args?.filePath,
                        success: true,
                        agentName,
                        metadata: {
                            isPublishing: isPublishOperation(tool),
                            hook: "tool_execution",
                            toolName: tool,
                            timestamp: Date.now(),
                            agentType: agentName,
                        },
                    };
                    const postResults = await processorManager.executePostProcessors(tool, postProcessorContext, []);
                    logPostProcessorResults(postResults, logger);
                }
                catch (error) {
                    logger.error(`💥 Post-processor execution error`, error);
                }
            }
        },
        "tool.execute.after": async (input, _output) => {
            const logger = await getOrCreateLogger(directory);
            await loadXrayComponents();
            const { tool, args, result } = input;
            if (isSubagentTool(tool)) {
                try {
                    const spawnResult = evaluatePostToolSpawn(tool, (args ?? {}), directory, { toolOutput: result });
                    if (spawnResult.satisfied.length > 0) {
                        logger.log(`🔗 Delegation gate post: satisfied ${spawnResult.satisfied.map((d) => d.id).join(", ")}`);
                    }
                }
                catch (error) {
                    logger.error("Delegation gate post-hook error", error);
                }
            }
            try {
                const { routingOutcomeTracker } = await import("../delegation/analytics/outcome-tracker.js");
                const { TOOL_AGENT_MAP } = await import("./plugin-helpers.js");
                const mapping = TOOL_AGENT_MAP[tool];
                const taskType = classifyTaskType(tool, args);
                const rawDesc = args?.content
                    ? String(args.content).slice(0, 150)
                    : args?.filePath
                        ? String(args.filePath)
                        : args?.command
                            ? String(args.command).slice(0, 150)
                            : tool;
                const description = `[${taskType}] ${rawDesc}`;
                const outcomeFields = {
                    taskId: `opencode-${_openCodeToolCallCount}`,
                    taskDescription: description,
                    routedAgent: mapping?.agent ?? "direct",
                    routedSkill: mapping?.skill ?? tool,
                    confidence: mapping ? 0.8 : 0.5,
                    success: result?.error == null,
                    routingMethod: mapping ? "keyword" : "default",
                };
                if (taskType !== "unknown")
                    outcomeFields.taskType = taskType;
                routingOutcomeTracker.recordOutcome(outcomeFields);
            }
            catch {
                // Outcome tracker not available — skip silently
            }
            logger.log(`📥 After hook input: ${JSON.stringify({ tool, hasArgs: !!args, args, hasResult: !!result }).slice(0, 200)}`);
            if (isWriteEditOperation(tool)) {
                const _ProcessorManager = getProcessorManager();
                const _XrayStateManager = getXrayStateManager();
                if (!_ProcessorManager || !_XrayStateManager)
                    return;
                const stateManager = new _XrayStateManager(await resolveStateDir(directory));
                const processorManager = new _ProcessorManager(stateManager);
                registerAfterPostProcessors(processorManager);
                try {
                    logger.log(`📝 Post-processor tool: ${tool}`);
                    logger.log(`📝 Post-processor args: ${JSON.stringify(args)}`);
                    logger.log(`📝 Post-processor directory: ${directory}`);
                    const postProcessorContext = {
                        directory,
                        operation: tool,
                        filePath: args?.filePath,
                        success: result?.success !== false,
                        metadata: {
                            isPublishing: isPublishOperation(tool),
                            hook: "tool_execution",
                            toolName: tool,
                            timestamp: Date.now(),
                        },
                    };
                    const postResults = await processorManager.executePostProcessors(tool, postProcessorContext, []);
                    logPostProcessorResults(postResults, logger);
                    logTestAutoCreationResult(postResults, logger);
                }
                catch (error) {
                    logger.error(`💥 Post-processor error`, error);
                }
            }
            _openCodeToolCallCount++;
            if (_openCodeToolCallCount - _lastTuneToolCallCount >= INFERENCE_TUNE_INTERVAL) {
                _lastTuneToolCallCount = _openCodeToolCallCount;
                try {
                    const { inferenceTuner } = await import("../services/inference-tuner.js");
                    inferenceTuner
                        .runTuningCycle()
                        .then(() => {
                        logger.log(`🔄 Inference tuning cycle completed (call #${_openCodeToolCallCount})`);
                    })
                        .catch((err) => {
                        logger.log(`⚠️ Inference tuning cycle skipped: ${err instanceof Error ? err.message : String(err)}`);
                    });
                }
                catch {
                    // Tuner not available in this environment — skip silently
                }
            }
        },
        "chat.message": async (input, output) => {
            const logger = await getOrCreateLogger(directory);
            if (!output.parts) {
                return;
            }
            const textContent = input.parts?.find(p => p.type === "text")?.text ?? "";
            if (!textContent) {
                return;
            }
            try {
                const { recordExecutionSlice } = await import("../nucleus/synthesis.js");
                let sessionId = process.env.GROK_SESSION_ID ?? null;
                try {
                    const boot = JSON.parse(readFileSync(join(directory, ".xray", "state", "session-boot.json"), "utf8"));
                    sessionId = boot.sessionId ?? sessionId;
                }
                catch {
                    /* no session boot */
                }
                if (sessionId) {
                    recordExecutionSlice("turn", { projectRoot: directory, sessionId });
                }
            }
            catch {
                /* synthesis turn slice optional */
            }
            const agentMentionRegex = /@([\w-]+)(?:\s+(.+?))?(?=$|\n\n|\r\r)/g;
            let match;
            let hasAgentMention = false;
            let transformedText = textContent;
            const knownAgents = {
                "architect": "architect",
                "strategist": "strategist",
                "testinglead": "testing-lead",
                "bugtriagespecialist": "bug-triage-specialist",
                "codereviewer": "code-reviewer",
                "securityauditor": "security-auditor",
                "refactorer": "refactorer",
                "researcher": "researcher",
                "codeanalyzer": "code-analyzer",
                "frontendengineer": "frontend-engineer",
                "frontenduiuxengineer": "frontend-ui-ux-engineer",
                "backendengineer": "backend-engineer",
                "databaseengineer": "database-engineer",
                "devopsengineer": "devops-engineer",
                "performanceengineer": "performance-engineer",
                "mobiledeveloper": "mobile-developer",
                "contentcreator": "content-creator",
                "growthstrategist": "growth-strategist",
                "seoconsultant": "seo-consultant",
                "techwriter": "tech-writer",
                "multimodallooker": "multimodal-looker",
                "logmonitor": "log-monitor",
            };
            while ((match = agentMentionRegex.exec(textContent)) !== null) {
                const agentName = match[1].toLowerCase().replace(/-/g, "");
                const taskPart = match[2]?.trim() ?? "";
                if (knownAgents[agentName]) {
                    hasAgentMention = true;
                    const canonicalAgent = knownAgents[agentName];
                    logger.log(`🎯 Agent mention detected: @${canonicalAgent}`);
                    const prefix = `\n[DELEGATE TO AGENT: ${canonicalAgent}]\n`;
                    transformedText = prefix + (taskPart || textContent.replace(`@${match[1]}`, "").trim());
                    break;
                }
            }
            if (hasAgentMention) {
                const textPart = output.parts.find(p => p.type === "text");
                if (textPart) {
                    textPart.text = transformedText;
                    logger.log(`✅ Transformed prompt for agent routing`);
                }
            }
        },
        config: async (_config) => {
            const lockFile = path.join(directory, ".opencode", "logs", ".xray-init.lock");
            const now = Date.now();
            try {
                if (fs.existsSync(lockFile)) {
                    const stat = fs.statSync(lockFile);
                    if (now - stat.mtimeMs < 15000) {
                        return;
                    }
                }
                fs.writeFileSync(lockFile, String(now));
            }
            catch {
                // lock check failed — proceed anyway
            }
            const logger = await getOrCreateLogger(directory);
            logger.log("🔧 Plugin config hook triggered - initializing 0xRay integration");
            let initScriptPath = path.join(directory, ".opencode", "init.sh");
            const pkgInitPath = path.join(directory, "node_modules", "0xray", ".opencode", "init.sh");
            if (!fs.existsSync(initScriptPath) && fs.existsSync(pkgInitPath)) {
                initScriptPath = pkgInitPath;
            }
            if (fs.existsSync(initScriptPath)) {
                try {
                    const { stderr } = await spawnPromise("bash", [initScriptPath], directory);
                    if (stderr) {
                        logger.error(`Framework init error: ${stderr}`);
                    }
                    else {
                        logger.log("✅ 0xRay Framework initialized successfully");
                    }
                }
                catch (error) {
                    logger.error("Framework initialization failed", error);
                }
            }
            logger.log("✅ Plugin config hook completed");
        },
    };
}
