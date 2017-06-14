import warning from '../utils/warning';

export default function normalizeMappings(mappings) {
  let normalized = [];

  // Flatten and remove trailing ".*"
  for (let i=0; i<mappings.length; ++i) {
    if (typeof mappings[i] === 'string') {
      const splitPath = mappings[i].split('.').filter((e) => e.length > 0);
      let prop = splitPath[splitPath.length-1];
      if (/^dispatch./.test(prop)) {
        prop = prop.substr('dispatch'.length, 1).toLowerCase() +
          prop.substr('dispatch'.length + 1);
      }
      
      normalized.push({
        path: splitPath[splitPath.length-1] === '*' ?
          splitPath.slice(0, splitPath.length-1) : splitPath,
        prop
      });
    } else {
      normalized = normalized.concat(Object.keys(mappings[i]).map((key) => ({
        path: key,
        prop: mappings[i][key]
      })));
    }
  }
  
  // Extract "dispatch*"
  normalized = normalized.map((m) =>
      (m.path.length > 0 && m.path[m.path.length-1] === 'dispatch*') ?
          Object.assign(p, {
            path: m.path.slice(0, m.path.length-1),
            dispatchAll: true
          }) : m);
          
  // Extract "select*"
  normalized = normalized.map((m) =>
      (m.path.length > 0 && (m.path[m.path.length-1] === 'select*' ||
          m.path[m.path.length-1] === '$') ?
          Object.assign(p, {
            path: m.path.slice(0, m.path.length-1),
            onlySelect: true
          }) : m));
  
  return normalized;
}
