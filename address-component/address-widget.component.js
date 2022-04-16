export class AddressWidget extends HTMLElement {

    tmpl;

    EXTERNAL_SOURCE_PATH = {
        css: '/address-component/address-widget.component.css'
    }

    REST_API = '//www.postdirekt.de/plzserver/PlzAjaxServlet';
    REST_API_WITH_CORS_ACCESS = 'https://cors-anywhere.herokuapp.com/https://www.postdirekt.de/plzserver/PlzAjaxServlet';

    INPUTFIELD;
    DATALIST;

    constructor() {
        super();

        // Create a shadow root
        this.attachShadow({ mode: 'open' });

        // Link external css
        const linkElement = document.createElement('link');
        linkElement.rel = 'stylesheet';
        linkElement.href = this.EXTERNAL_SOURCE_PATH.css;

        // Attach link to shadowRoot
        this.shadowRoot.append(linkElement);

        // Create Template
        this.tmpl = document.createElement('template');
    }

    /**
     *  ConnectedCallback is invoked each time the custom element is appended into a document-connected element
     */
    connectedCallback() {
        fetch('../address-component/address-widget.component.html')
            .then(r => r.text())
            .then(t => {
                /**
                 * Attach Widget Template to shadowRoot
                 */
                this.tmpl.innerHTML = t;
                this.shadowRoot.append(this.tmpl.content.cloneNode(true));

                /**
                 * Initialize Form
                 */
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

                this.INPUTFIELD.ZIPCODE.addEventListener('keyup', this.suggestCitiesByZipCode.bind(this));
                this.INPUTFIELD.STREET.addEventListener('keyup', this.suggestStreetsByStreet.bind(this));

                const INFO_BUTTON = this.shadowRoot.querySelector('button#info-button');
                INFO_BUTTON.addEventListener('click', this.collectAddressData.bind(this));
            });
    }

    suggestCitiesByZipCode() {
        // Get
        const value = this.INPUTFIELD.ZIPCODE.value; // e.g. "78532 - Tuttlingen"
        const zipCode = value.split(' - ')[0];
        const length = zipCode.length;

        if (length == 3 || length == 4) this.synchronizeDatalistCities(zipCode);
        else if (length == 5) this.autofillCity();
        else this.clearDatalist(this.DATALIST.CITIES);
    }

    async suggestStreetsByStreet() {
        // Get
        const city = this.INPUTFIELD.CITY.value;
        const street = this.INPUTFIELD.STREET.value;

        // Validation
        if (city.length != 0 && street.length != 0) await this.synchronizeDatalistStreets(city, street);

        // Clear datalist after choosen an item
        this
            .DATALIST
            .STREETS
            .childNodes
            .forEach(opt => {
                if (opt.value == street) {
                    this.clearDatalist(this.DATALIST.STREETS);
                    this.INPUTFIELD.HOUSENUMBER.focus();
                }
            })
    }

    collectAddressData() {
        alert('Output in the console!');
        const address = {
            zip: this.INPUTFIELD.ZIPCODE.value,
            city: this.INPUTFIELD.CITY.value,
            street: this.INPUTFIELD.STREET.value,
            houseNumber: this.INPUTFIELD.HOUSENUMBER.value,
            country: this.INPUTFIELD.COUNTRY.value,
        }
        console.table(address);
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

    createOption(zipCode, city) {
        const opt = document.createElement('option');
        const splitString = ' - ';
        opt.value = `${zipCode}${splitString}${city}`;
        return opt;
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

    /**
     * Invoked each time the custom element is disconnected from the document's DOM
     */
    disconnectedCallback() {
        // ...
    }

    /**
     * Invoked each time the custom element is moved to a new document
     */
    adoptedCallback() {
        // ...
    }

    /**
     * Invoked each time one of the custom element's attributes is added, removed, or changed
     * @param {*} name 
     * @param {*} oldValue 
     * @param {*} newValue 
     */
    attributeChangedCallback(name, oldValue, newValue) {
        // ...
    }
}