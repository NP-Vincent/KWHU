import { createApiServer } from './api.js'
import { config } from './config.js'
import { startMqttSubscriber } from './mqtt.js'

async function main() {
  const app = createApiServer()
  await startMqttSubscriber()

  app.listen(config.port, () => {
    console.log(`KWHU metering service listening on port ${config.port}`)
  })
}

main().catch((error) => {
  console.error('Failed to start metering service', error)
  process.exit(1)
})
