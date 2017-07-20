/* Simple workaround for environments lacking symbols support  */
export default (label) => (Symbol ? Symbol(label) : `__$Symbol(${label})`)
