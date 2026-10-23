import{r as a,e as c,jN as o}from"./index-DxjZdrqo.js";function i(e,l){const[n,r]=a.useState(null);return a.useEffect(()=>{if(e===null||l===null){r(null);return}let t=!0,u=null;return c(o.load(e,l)).then(s=>{t?(u=s,r(s)):URL.revokeObjectURL(s)}).catch(()=>{t&&r(null)}),()=>{t=!1,u!==null&&URL.revokeObjectURL(u)}},[e,l]),n}export{i as u};
//# sourceMappingURL=use-image-B_JmfvBV.js.map
