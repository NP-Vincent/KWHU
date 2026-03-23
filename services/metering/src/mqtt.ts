import mqtt from 'mqtt'

import { config } from './config.js'
import {
  ensureMeteringSubscriberAccess,
  getTlsCaBuffer,
  waitForTlsCaFile,
} from './mosquitto.js'
import { processMeterReading } from './processing.js'
import { normalizeMeterPayload } from './utils.js'

export async function startMqttSubscriber() {
  await waitForTlsCaFile()
  await ensureMeteringSubscriberAccess()

  const client = mqtt.connect(`mqtts://${config.mqttBrokerHost}:${config.mqttBrokerPort}`, {
    username: config.mqttServiceUsername,
    password: config.mqttServicePassword,
    ca: getTlsCaBuffer(),
    rejectUnauthorized: true,
    reconnectPeriod: 3000,
  })

  client.on('connect', () => {
    client.subscribe('kwhu/meters/+/+/renewable', { qos: 1 }, (error) => {
      if (error) {
        console.error('Failed to subscribe to meter topics', error)
      }
    })
  })

  client.on('message', async (topic, payloadBuffer) => {
    const payloadText = payloadBuffer.toString('utf8')

    try {
      const parsed = JSON.parse(payloadText)
      const normalizedPayload = normalizeMeterPayload(parsed)
      await processMeterReading(topic, payloadText, normalizedPayload)
    } catch (error) {
      console.error('Failed to process MQTT message', {
        topic,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  })

  client.on('error', (error) => {
    console.error('MQTT client error', error)
  })

  return client
}
