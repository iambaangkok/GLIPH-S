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

  const _default: {
    configs: Configs
    parseTweet: typeof parseTweet
  }

  export default _default
}
