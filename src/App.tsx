import { BedrockExperience } from './components/experience/BedrockExperience'
import documentData from './content/bedrock.json'
import type { BedrockDocument } from './types/content'

const document = documentData as BedrockDocument

export default function App() {
  return <BedrockExperience document={document} />
}
