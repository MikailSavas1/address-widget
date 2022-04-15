class AddressWidget extends HTMLElement {

    tmpl;

    EXTERNAL_SOURCE_PATH = {
        css: 'address-widget.css'
    }

    REST_API = '//www.postdirekt.de/plzserver/PlzAjaxServlet';

    INPUTFIELD;
    DATALIST;

    constructor() {
        super();

        // Create a shadow root
        this.attachShadow({ mode: 'open' });

        // Create all form-groups
        const formGroups = [
            this.createFormGroup('zip-code'),
            this.createFormGroup('city'),
            this.createFormGroup('street'),
            this.createFormGroup('house-number'),
            this.createFormGroup('country')
        ];

        // Create button
        const button = document.createElement('button');
        button.type = 'button';
        button.textContent = 'Info';
        button.addEventListener('click', () => {
            alert('Output in the console!')
            const address = {
                zip: this.INPUTFIELD.ZIPCODE.value,
                city: this.INPUTFIELD.CITY.value,
                street: this.INPUTFIELD.STREET.value,
                houseNumber: this.INPUTFIELD.HOUSENUMBER.value,
                country: this.INPUTFIELD.COUNTRY.value,
            }
            console.table(address);
        })

        // Link external css
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = this.EXTERNAL_SOURCE_PATH.css;

        // Attach the created elements to the shadow DOM
        this.shadowRoot.append(linkElement);
        formGroups.forEach(formGroup => this.shadowRoot.append(formGroup));
        this.shadowRoot.append(button);

        // Create Template
        this.tmpl = document.createElement('template');

        // Init
        this.INPUTFIELD = {
            ZIPCODE: this.shadowRoot.querySelector('input#zip-code'),
            CITY: this.shadowRoot.querySelector('input#city'),
            STREET: this.shadowRoot.querySelector('input#street'),
            HOUSENUMBER: this.shadowRoot.querySelector('input#house-number'),
            COUNTRY: this.shadowRoot.querySelector('input#country')
        };
        this.DATALIST = {
            CITIES: this.shadowRoot.querySelector('datalist#suggestions-cities'),
            STREETS: this.shadowRoot.querySelector('datalist#suggestions-streets')
        }

    }

    /**
     *  ConnectedCallback is invoked each time the custom element is appended into a document-connected element
     */
    connectedCallback() {
        fetch('../address-widget.component.html')
            .then(r => r.text())
            .then(t => {
                this.tmpl.innerHTML = t;
                this.shadowRoot.append(this.tmpl.content.cloneNode(true));
            });
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

    async fetchStreets(fromCity, street) {
        const response = await fetch(this.REST_API + `?autocomplete=street&plz_city=${fromCity}&plz_street=${street}`);
        const bodyOfResponse = await response.json();
        return bodyOfResponse;
    }

    async synchronizeDatalistCities(zipCode) {

        // Fetch & initializie rows
        const bodyOfResponse = await this.fetchCities(zipCode);
        const rows = bodyOfResponse.rows;

        // Display them correctly
        if (rows) this.updateDatalistCities(rows);
        else this.clearDatalist(this.DATALIST.CITIES);

    }

    async synchronizeDatalistStreets(city, street) {

        // Fetch & initializie rows
        const bodyOfResponse = await this.fetchStreets(city, street);
        const rows = bodyOfResponse.rows;
        const count = bodyOfResponse.count;

        // Display them correctly
        if (count != 0) this.updateDatalistStreets(rows);

    }

    updateDatalistCities(fetchedArray) {

        // Create a Set, avoid displaying dublicates
        let array = [];
        fetchedArray.forEach(cityObj => {
            array.push(`${cityObj.plz} - ${cityObj.city}`);
        })
        const set = new Set(array);

        // Clear
        this.clearDatalist(this.DATALIST.CITIES);

        // Append option(s) to datalist
        set.forEach(item => {
            const zipCode = item.split(' - ')[0];
            const city = item.split(' - ')[1];
            const opt = this.createOption(zipCode, city);
            this.DATALIST.CITIES.append(opt);
        })
    }

    updateDatalistStreets(fetchedArray) {

        // Clear
        this.clearDatalist(this.DATALIST.STREETS);

        // Append option(s) to datalist
        fetchedArray.forEach(item => {
            const opt = document.createElement('option');
            opt.value = item.street;
            this.DATALIST.STREETS.append(opt);
        })

    }

    autofillCity() {

        const value = this.INPUTFIELD.ZIPCODE.value; // e.g. "78532 - Tuttlingen" || "78532"  --> SPLIT & SEPERATE DATA

        // Initialize city
        let city = value.split(' - ')[1] ? value.split(' - ')[1] : 'NONE CITY CHOOSEN FROM DATALIST';

        // Initialize zip-code
        const zipCode = value.split(' - ')[0];
        this.setZipCode(zipCode);

        if (city == 'NONE CITY CHOOSEN FROM DATALIST') {

            // DETECT, WHETHER DATALIST (OF CITIES) IS DISPLAYING EXACTLY 1 OPTION. ONLY THEN AUTOCOMPLETE

            // Get options of datalist & add them to a custom array with only the suggestion-values, because filter is not provided in the array of (node)object
            // IT IS NECESSARY BECAUSE A ZIPCODE E.G. "17337" CAN HAVE DIFFERENT POSSIBLES CITIES TO CHOOSE AT THE SAME ZIP
            // THEREFORE WE SHOULDNT AUTOFILL ANY UNWANTED VALUE AND LET THE USER CHOOSE!
            // FILTER IS NOT PROVIDED IN THAT ARRAY OF NODE OBJECTS UNFORTUNATELY, THEREFORE WE CREATE A CUSTOMIZED DATALIST ADDED BY THE OPTION VALUES AS STRINGS
            let customizedDatalist = []; // :string[] e.g. ['78532 - Tuttlingen']
            this
                .DATALIST
                .CITIES
                .childNodes
                .forEach(item => {
                    const zipCode = item.value.split(' - ')[0];
                    const city = item.value.split(' - ')[1];
                    customizedDatalist.push(`${zipCode} - ${city}`);
                })

            const zipCode = this.INPUTFIELD.ZIPCODE.value;
            const filteredDatalist = customizedDatalist.filter(optionValue => optionValue.split(' - ')[0] == zipCode);

            if (filteredDatalist.length == 1) {
                const option = filteredDatalist[0];
                // Initialize city
                city = option.split(' - ')[1];
                this.clearDatalist(this.DATALIST.CITIES);
            } else city = 'BULLSHIT';

        } else this.clearDatalist(this.DATALIST.CITIES);

        if (city != 'BULLSHIT') {
            this.setCity(city);
            this.INPUTFIELD.STREET.focus();
        }
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

    createFormGroup(name) {

        let formGroup;
        let label;
        let input;
        let datalist;

        switch (name) {
            case 'zip-code':

                // Create container
                formGroup = document.createElement('div');

                // Create label
                label = this.createLabel('zip-code', 'PLZ');

                // Create input
                input = document.createElement('input');
                // characteristic
                input.setAttribute('type', 'text');
                input.setAttribute('id', 'zip-code');
                input.setAttribute('name', 'zipCode');
                input.setAttribute('list', 'suggestions-cities');
                input.setAttribute('placeholder', '12345');
                // validation
                input.setAttribute('onKeyPress', 'if(this.value.length < 5) return (/^[0-9]$/.test(event.key)); else return false');
                // functionallity
                input.addEventListener('keyup', () => {

                    // Get
                    const value = this.INPUTFIELD.ZIPCODE.value; // e.g. "78532 - Tuttlingen"
                    const zipCode = value.split(' - ')[0];
                    const length = zipCode.length;

                    if (length == 3 || length == 4) this.synchronizeDatalistCities(zipCode);
                    else if (length == 5) this.autofillCity();
                    else this.clearDatalist(this.DATALIST.CITIES);
                });

                // Create datalist
                datalist = this.createDatalist('suggestions-cities');

                // Attach children to container
                formGroup.append(label, input, datalist);

                return formGroup;

            case 'city':

                // Create container
                formGroup = document.createElement('div');

                // Create label
                label = this.createLabel('city', 'Stadt');

                // Create input
                input = document.createElement('input');
                // characteristic
                input.setAttribute('type', 'text');
                input.setAttribute('id', 'city');
                input.setAttribute('name', 'city');
                input.setAttribute('placeholder', 'Musterstadt');
                // validation
                input.setAttribute('onKeyPress', 'return (!/^[0-9]$/.test(event.key))');
                input.setAttribute('maxlength', '32');

                // Attach children to container
                formGroup.append(label, input);

                return formGroup;

            case 'street':

                // Create container
                formGroup = document.createElement('div');

                // Create label
                label = this.createLabel('street', 'Straße');

                // Create input
                input = document.createElement('input');
                // characteristic
                input.setAttribute('type', 'text');
                input.setAttribute('id', 'street');
                input.setAttribute('name', 'street');
                input.setAttribute('list', 'suggestions-streets');
                input.setAttribute('placeholder', 'Musterstraße');
                // validation
                input.setAttribute('onKeyPress', 'return (!/^[0-9]$/.test(event.key))');
                input.setAttribute('maxlength', '50');
                // functionallity
                input.addEventListener('keyup', async () => {

                    // Get
                    const city = this.INPUTFIELD.CITY.value;
                    const street = this.INPUTFIELD.STREET.value;

                    // Validation
                    if (city.length != 0 && street.length != 0) await this.synchronizeDatalistStreets(city, street);

                    // Clear dl after choosen an item from dl
                    this
                        .DATALIST
                        .STREETS
                        .childNodes
                        .forEach(opt => {
                            if (opt.value == street) this.clearDatalist(this.DATALIST.STREETS);
                        })

                });

                // Create datalist
                datalist = this.createDatalist('suggestions-streets');

                // Attach children to container
                formGroup.append(label, input, datalist);

                return formGroup;

            case 'house-number':

                // Create container
                formGroup = document.createElement('div');

                // Create label
                label = this.createLabel('house-number', 'Hausnummer');

                // Create input
                input = document.createElement('input');
                input.setAttribute('type', 'text');
                input.setAttribute('id', 'house-number');
                input.setAttribute('name', 'houseNumber');
                input.setAttribute('placeholder', '86f');
                input.setAttribute('maxlength', '15');

                // Attach children to container
                formGroup.append(label, input);

                return formGroup;

            case 'country':

                // Create container
                formGroup = document.createElement('div');

                // Create label
                label = this.createLabel('country', 'Land');

                // Create input
                input = document.createElement('input');
                input.setAttribute('type', 'text');
                input.setAttribute('id', 'country');
                input.setAttribute('name', 'country');
                input.setAttribute('value', 'Deutschland');
                input.setAttribute('readonly', '');

                // Attach children to container
                formGroup.append(label, input);

                return formGroup;
        }
    }

    clearDatalist(datalist) {
        datalist.innerHTML = '';
    }

    setCity(city) {
        this.INPUTFIELD.CITY.value = city;
    }

    setZipCode(zipCode) {
        this.INPUTFIELD.ZIPCODE.value = zipCode;
    }
}

customElements.define('address-widget', AddressWidget);