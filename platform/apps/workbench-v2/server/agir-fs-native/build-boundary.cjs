// F2 safety gate: do not build/package the current native helper. openat2
// protects path resolution but does not prevent an opened directory from being
// renamed outside the workspace while an operation is in flight. Re-enable the
// addon only after the namespace-move guarantee is resolved and race-tested.
console.log('[F2] Native boundary build disabled: concurrent parent-directory rename is not contained.')
process.exit(0)
