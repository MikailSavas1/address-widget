class AddressWidget extends HTMLElement {

    zipCode;
    city;

    EXTERNAL_SOURCE_PATH = {
        css: 'address-widget.css'
    }

    REST_API = '//www.postdirekt.de/plzserver/PlzAjaxServlet';

    DATALIST;

    constructor() {
        super();

        // Create a shadow root
        this.attachShadow({ mode: 'open' });


        // Create wrapper
        const container = document.createElement('div');
        // Create label
        const label = this.createLabel('zip-code', 'PLZ');
        // Create input
        const input = document.createElement('input');
        // character
        input.setAttribute('type', 'number');
        input.setAttribute('id', 'zip-code');
        input.setAttribute('name', 'zip-code');
        input.setAttribute('list', 'suggestions-city');
        input.setAttribute('placeholder', '12345');
        // validation
        input.setAttribute('min', '0');
        input.setAttribute('onKeyPress', 'if(this.value.length >= 5) return false;');
        // functionallity
        input.addEventListener('keyup', () => {
            this.synchronizeDatalist();
        });
        input.addEventListener('input', (event) => {
            // Binding
            this.zipCode = event.target.value;
            // if (this.zipCode.length == 5) this.autofillCity();
        });

        // Create datalist
        const datalist = this.createDatalist('suggestions-city');

        // Attach children to container
        container.append(label, input, datalist);



        // Link external css
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = this.EXTERNAL_SOURCE_PATH.css;

        // Attach the created elements to the shadow DOM
        this.shadowRoot.append(linkElement, container);

        // Init
        this.DATALIST = this.shadowRoot.querySelector('datalist#suggestions-city');
        // this.zip = this.shadowRoot.querySelector('#zip-code').value;
    }

    async fetchCities(zipCode) {
        const response = await fetch(this.REST_API, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
            },
            body: `finda=city&city=${zipCode}&lang=de_DE`
        });
        const bodyOfResponse = await response.json();
        return bodyOfResponse;
    }

    async synchronizeDatalist() {

        const length = this.zipCode.length;

        if (length == 3 || length == 4) {

            // Fetch & initializie rows
            const bodyOfResponse = await this.fetchCities(this.zipCode);
            const rows = bodyOfResponse.rows;

            // Display them correctly
            if (rows) this.updateDatalist(rows);
            else this.DATALIST.innerHTML = '';

        }
        else if (length == 5) {
            this.autofillCity();
        }
        else this.DATALIST.innerHTML = '';

    }

    autofillCity() {

        const opts = this.DATALIST.childNodes;

        for (let i = 0; i < opts.length; i++) {
            if (opts[i].value === this.zipCode && opts[i].getAttribute('id') == 3) {
                // An item was selected from the list!
                // TODO
                // ...
                console.log(opts[i].textContent);
                break;
            }
        }

    }

    updateDatalist(arr) {
        // Clear
        this.DATALIST.innerHTML = '';
        // Append option(s)
        arr.forEach((item, index) => {
            const zipCode = item.plz;
            const city = item.city;
            const opt = this.createOption(zipCode, city, index);
            this.DATALIST.append(opt);
        })
    }

    createDatalist(id) {
        const datalist = document.createElement('datalist');
        datalist.setAttribute('id', id);
        return datalist;
    }

    createOption(zipCode, city, index) {
        const opt = document.createElement('option');
        opt.value = zipCode;
        opt.textContent = city;
        opt.setAttribute('id', index);
        return opt;
    }

    createLabel(forValue, textContent) {
        const label = document.createElement('label');
        label.setAttribute('for', forValue);
        label.textContent = textContent;
        return label;
    }
}

customElements.define('address-widget', AddressWidget);