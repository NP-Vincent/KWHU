import { execFile } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { promisify } from 'node:util'

import { config } from './config.js'

const execFileAsync = promisify(execFile)

function baseArgs() {
  return [
    '--cafile',
    config.mqttCaCertPath,
    '-h',
    config.mqttBrokerHost,
    '-p',
    String(config.mqttBrokerPort),
    '-u',
    config.mqttAdminUsername,
    '-P',
    config.mqttAdminPassword,
  ]
}

async function runDynsecCommand(args: string[]) {
  try {
    return await execFileAsync('mosquitto_ctrl', [...baseArgs(), 'dynsec', ...args])
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown mosquitto_ctrl error'
    throw new Error(message)
  }
}

async function runDynsecCommandIgnoringConflict(args: string[]) {
  try {
    await runDynsecCommand(args)
  } catch {
    // The dynamic security plugin reports conflicts via command failures.
    // Re-running create/add commands during restarts should stay idempotent.
  }
}

async function dynsecGetRole(roleName: string) {
  try {
    await runDynsecCommand(['getRole', roleName])
    return true
  } catch {
    return false
  }
}

async function dynsecGetClient(username: string) {
  try {
    await runDynsecCommand(['getClient', username])
    return true
  } catch {
    return false
  }
}

export async function ensureWalletPublisherAccess(
  walletAddress: string,
  username: string,
  password: string,
  topicPattern: string,
) {
  const roleName = `publisher-${walletAddress.toLowerCase()}`

  if (!(await dynsecGetRole(roleName))) {
    await runDynsecCommand(['createRole', roleName])
    await runDynsecCommand([
      'addRoleACL',
      roleName,
      'publishClientSend',
      topicPattern,
      'allow',
      '10',
    ])
  }

  if (!(await dynsecGetClient(username))) {
    await runDynsecCommand(['createClient', username])
  }
  await runDynsecCommand(['setClientPassword', username, password])

  await runDynsecCommandIgnoringConflict(['addClientRole', username, roleName, '10'])
}

export async function ensureMeteringSubscriberAccess() {
  const roleName = 'kwhu-metering-service-reader'
  const username = config.mqttServiceUsername
  const password = config.mqttServicePassword

  if (!(await dynsecGetRole(roleName))) {
    await runDynsecCommand(['createRole', roleName])
    await runDynsecCommand([
      'addRoleACL',
      roleName,
      'subscribePattern',
      'kwhu/meters/+/+/renewable',
      'allow',
      '10',
    ])
    await runDynsecCommand([
      'addRoleACL',
      roleName,
      'publishClientReceive',
      'kwhu/meters/+/+/renewable',
      'allow',
      '10',
    ])
  }

  if (!(await dynsecGetClient(username))) {
    await runDynsecCommand(['createClient', username])
  }
  await runDynsecCommand(['setClientPassword', username, password])

  await runDynsecCommandIgnoringConflict(['addClientRole', username, roleName, '10'])
}

export function getTlsCaBuffer() {
  return readFileSync(config.mqttCaCertPath)
}

export async function waitForTlsCaFile() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (existsSync(config.mqttCaCertPath)) {
      return
    }

    await new Promise((resolve) => setTimeout(resolve, 1000))
  }

  throw new Error(`Timed out waiting for MQTT CA file at ${config.mqttCaCertPath}`)
}
