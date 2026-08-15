const { KitanaLlm } = require('@kitana-sdk/adk')
const { LlmAgent, Runner, InMemorySessionService } = require('@google/adk')

async function main() {
  const agent = new LlmAgent({
    name: 'hello',
    model: new KitanaLlm({ model: 'mistral:instruct', chain: ['claude', 'ollama'] }),
    instruction: 'Отвечай кратко на русском.'
  })
  const sessionService = new InMemorySessionService()
  const runner = new Runner({ agent, appName: 'test', sessionService })
  const session = await sessionService.createSession({ appName: 'test', userId: 'user' })

  for await (const event of runner.runAsync({
    userId: 'user',
    sessionId: session.id,
    newMessage: { role: 'user', parts: [{ text: 'Привет! Как дела?' }] }
  })) {
    if (event.content?.parts?.[0]?.text) {
      console.log('RESPONSE:', event.content.parts[0].text, '| provider:', event.customMetadata?.kitanaProvider)
    } else if (event.errorMessage) {
      console.log('ERROR:', event.errorMessage)
    }
  }
}

main().catch(e => console.error('FATAL:', e))
