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

        // Create all form-groups
        const formGroups = [
            this.createFormGroup('zip-code')
        ];

        // Link external css
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = this.EXTERNAL_SOURCE_PATH.css;

        // Attach the created elements to the shadow DOM
        this.shadowRoot.append(linkElement);
        formGroups.forEach(formGroup => this.shadowRoot.append(formGroup));

        // Init
        this.DATALIST = this.shadowRoot.querySelector('datalist#suggestions-city');
        this.zipCode = '';
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

        // Fetch & initializie rows
        const bodyOfResponse = await this.fetchCities(this.zipCode);
        const rows = bodyOfResponse.rows;

        // Display them correctly
        if (rows) this.updateDatalist(rows);
        else this.DATALIST.innerHTML = '';

    }

    updateDatalist(fetchedArray) {

        // Create a Set, avoid displaying dublicates
        let array = [];
        fetchedArray.forEach(cityObj => {
            array.push(`${cityObj.plz} - ${cityObj.city}`);
        })
        const set = new Set(array);

        // Clear
        this.DATALIST.innerHTML = '';

        // Append option(s) to datalist
        set.forEach(item => {
            const zipCode = item.split(' - ')[0];
            const city = item.split(' - ')[1];
            const opt = this.createOption(zipCode, city);
            this.DATALIST.append(opt);
        })
    }

    autofillCity(inputfield, datalist) {

        const input = inputfield;
        const value = input.value; // e.g. "78532 - Tuttlingen" || "78532"

        // Split & seperate data
        let city = value.split(' - ')[1] ? value.split(' - ')[1] : 'NONE CITY CHOOSEN FROM DATALIST';
        // Initialize zip-code
        input.value = value.split(' - ')[0];

        if (city == 'NONE CITY CHOOSEN FROM DATALIST') {

            const filteredDatalist = datalist.filter(optionValue => optionValue.split(' - ')[0] == this.zipCode);

            if (filteredDatalist.length == 1) {
                // Initialize city
                city = filteredDatalist[0].split(' - ')[1];
                this.DATALIST.innerHTML = '';
            }
            else city = 'BULLSHIT';

        } else this.DATALIST.innerHTML = '';


        if (city != 'BULLSHIT') console.log(city);

    }

    createDatalist(id) {
        const datalist = document.createElement('datalist');
        datalist.setAttribute('id', id);
        return datalist;
    }

    createOption(zipCode, city) {
        const opt = document.createElement('option');
        const splitString = ' - ';
        opt.value = `${zipCode}${splitString}${city}`;
        return opt;
    }

    createLabel(forValue, textContent) {
        const label = document.createElement('label');
        label.setAttribute('for', forValue);
        label.textContent = textContent;
        return label;
    }

    createFormGroup(text) {
        switch (text) {
            case 'zip-code':
                const formGroup = document.createElement('div');
                // Create label
                const label = this.createLabel('zip-code', 'PLZ');
                // Create input
                const input = document.createElement('input');
                input.setAttribute('type', 'text');
                input.setAttribute('id', 'zip-code');
                input.setAttribute('name', 'zip-code');
                input.setAttribute('list', 'suggestions-city');
                input.setAttribute('placeholder', '12345');
                // validation
                input.setAttribute('onKeyPress', 'if(this.value.length < 5) return (/^[0-9]$/.test(event.key)); else return false');
                // functionallity
                input.addEventListener('keyup', (event) => {

                    // Get
                    const inputfield = event.target;
                    const value = inputfield.value; // e.g. "78532 - Tuttlingen"
                    const zipCode = value.split(' - ')[0];
                    const length = zipCode.length;

                    // (Global) Binding
                    this.zipCode = zipCode;

                    if (length == 3 || length == 4) {
                        this.synchronizeDatalist();
                    }
                    else if (length == 5) {
                        // Get options of datalist
                        // Convert to a custom array with the suggestion-values, because filter is not provided in the array of (node)object
                        let options = [];
                        this.DATALIST.childNodes.forEach(item => {
                            const zipCode = item.value.split(' - ')[0];
                            const city = item.value.split(' - ')[1];
                            options.push(`${zipCode} - ${city}`);
                        })
                        this.autofillCity(inputfield, options);
                    }
                    else {
                        this.DATALIST.innerHTML = '';
                    }

                });

                // Create datalist
                const datalist = this.createDatalist('suggestions-city');

                // Attach children to container
                formGroup.append(label, input, datalist);

                return formGroup;

            default:
                break;
        }
    }
}

customElements.define('address-widget', AddressWidget);