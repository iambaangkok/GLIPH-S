/**
 * Minimal ambient declaration for twitter-text v3.1.0.
 * The package ships no TS types; we declare only what we use.
 */
declare module 'twitter-text' {
  export interface ParseTweetResult {
    weightedLength: number
    permillage: number
    valid: boolean
    displayRangeStart: number
    displayRangeEnd: number
    validRangeStart: number
    validRangeEnd: number
  }

  export interface TweetParseConfig {
    version?: number
    maxWeightedTweetLength?: number
    scale?: number
    defaultWeight?: number
    transformedURLLength?: number
    ranges?: Array<{ start: number; end: number; weight: number }>
  }

  export interface Configs {
    defaults: TweetParseConfig
    version1: TweetParseConfig
    version2: TweetParseConfig
  }

  const configs: Configs

  function parseTweet(text: string, options?: TweetParseConfig): ParseTweetResult

  /**
   * A single extracted entity. `indices` are code-point offsets [start, end).
   * Exactly one of the optional descriptor fields is present, identifying the
   * entity kind: mention (`screenName`), `hashtag`, `cashtag`, or `url`.
   */
  export interface EntityWithIndices {
    indices: [number, number]
    screenName?: string
    hashtag?: string
    cashtag?: string
    url?: string
    listSlug?: string
  }

  function extractEntitiesWithIndices(text: string): EntityWithIndices[]

  const _default: {
    configs: Configs
    parseTweet: typeof parseTweet
    extractEntitiesWithIndices: typeof extractEntitiesWithIndices
  }

  export default _default
}
