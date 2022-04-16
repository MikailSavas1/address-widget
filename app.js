import { AddressWidget } from "./address-component/address-widget.component.js"

window.customElements.define('address-widget', AddressWidget);
window.customElements.whenDefined('address-widget').then(() => {
    console.log('address-widget defined');
})