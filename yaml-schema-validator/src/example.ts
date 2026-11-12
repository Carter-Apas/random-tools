export const exampleYaml = `# Edit this document or use the schema options alongside it.
name: weather-station
environment: development
port: 8080
logging:
  enabled: true
  level: info
tags:
  - outdoor
`;

export const exampleSchema = `$schema: https://json-schema.org/draft/2020-12/schema
title: App configuration
description: Settings for a small self-hosted service.
type: object
additionalProperties: false
required:
  - name
  - environment
  - port
properties:
  name:
    type: string
    title: Service name
    description: Lowercase letters, numbers, and hyphens.
    minLength: 1
    pattern: '^[a-z][a-z0-9-]*$'
  environment:
    type: string
    title: Environment
    enum:
      - development
      - staging
      - production
  port:
    type: integer
    title: Port
    minimum: 1
    maximum: 65535
  logging:
    title: Logging
    type: object
    additionalProperties: false
    properties:
      enabled:
        type: boolean
        title: Enable logging
      level:
        $ref: '#/$defs/logLevel'
  tags:
    title: Tags
    description: Add a tag for each group this service belongs to.
    type: array
    uniqueItems: true
    items:
      type: string
      minLength: 1
$defs:
  logLevel:
    type: string
    title: Log level
    enum:
      - debug
      - info
      - warn
      - error
`;
