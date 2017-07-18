/* Simple workaround for platforms lacking symbols support  */
export default Symbol || ((name) => `_$${name}`)
