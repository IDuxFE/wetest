export function getDefaultSelectorCfg () {
    return {
        buryingPoint: '',
        excludeClass: [],
        excludeClassModify: new RegExp(/./),
        excludeAttr: new RegExp(/./),
        excludeIdByVal: new RegExp(/./),
    }
}