import type { Express } from 'express'

import { createApiServer } from '../../api/runtime'

export async function createNestServer(expressApp: Express) {
  return createApiServer(expressApp)
}