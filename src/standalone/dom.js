export function selectedValue(id) {
  const node = document.getElementById(id);
  return node ? node.value : "";
}