/**
 * Ambient declaration for the `drag-drop-touch` polyfill (no bundled types).
 *
 * We import it purely for its side effect: at module load it instantiates a
 * singleton that, on touch devices, translates touch events into standard HTML5
 * drag-and-drop events — making all the app's native-DnD reordering (threads,
 * templates, favorites, posts) work on phones/tablets with no code changes.
 */
declare module 'drag-drop-touch'
