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
   * A single extracted entity. `indices` are **UTF-16 code-unit** offsets
   * [start, end) as returned by `extractEntitiesWithIndices` — convert them with
   * `modifyIndicesFromUTF16ToUnicode` before indexing a code-point array (they
   * diverge across astral / SMP glyphs). Exactly one of the optional descriptor
   * fields is present: mention (`screenName`), `hashtag`, `cashtag`, or `url`.
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

  /**
   * Rewrites each entity's `indices` in place from UTF-16 code-unit offsets to
   * Unicode code-point offsets, so they line up with `Array.from(text)`.
   */
  function modifyIndicesFromUTF16ToUnicode(
    text: string,
    entities: EntityWithIndices[],
  ): void

  const _default: {
    configs: Configs
    parseTweet: typeof parseTweet
    extractEntitiesWithIndices: typeof extractEntitiesWithIndices
    modifyIndicesFromUTF16ToUnicode: typeof modifyIndicesFromUTF16ToUnicode
  }

  export default _default
}
