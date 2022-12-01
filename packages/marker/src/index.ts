let idAttr = 'data-o-s-t'
let decsAttr = 'aria-label'

export function marker(id: string | number, decs: string) {
  return {
    [idAttr]: id,
    [decsAttr]: decs,
  }
}

interface MarkerAttrs {
  idAttr: string
  decsAttr: string
}
export function setMarkerAttr(opt: MarkerAttrs) {
  ;({ idAttr, decsAttr } = opt)
}
