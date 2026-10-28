"use strict";
const SALT = "63468D4A7232221586C7B820888B269C384741C86D473B2923FA91CBCCF79863",
      header = [0x46, 0x49, 0x4e, 0x41, 0x4e, 0x43, 0x45, 0x53],
      aes = {
    get IV_SIZE() { return 16; },
    /**
     * Get default encryption parameters.
     *
     * @returns {AesGcmParams}
     * @param {?Uint8Array} iv
     */
    getAlgorthm: iv => {
        if (iv === undefined) {
            iv = crypto.getRandomValues(new Uint8Array(aes.IV_SIZE));
        }

        if (iv.length != aes.IV_SIZE) {
            throw new RangeError(`IV must be ${aes.IV_SIZE} bytes`);
        }

        return {
            name: 'AES-GCM',
            length: 256,
            iv: iv
        };
    },

    /**
     * Generate Crypto Key
     *
     * @param {String} password
     * @return {CryptoKey}
     */
    generateKey: async password => {
        var encoder = new TextEncoder();
        var algo = {
            name: 'PBKDF2',
            hash: 'SHA-256',
            salt: encoder.encode(SALT),
            iterations: 1000
        };
        let key = await crypto.subtle.importKey('raw', encoder.encode(password), { name: 'PBKDF2'}, false, ['deriveKey']);
        return crypto.subtle.deriveKey(algo, key, aes.getAlgorthm(), false, ['encrypt', 'decrypt']);
    }
};

const v1 = {
    version: "1.0.0",
    header: header.concat([0xff, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0xff]),

    /**
     * @param {String} password
     * @param {String} plaintext
     * @returns {Uint8Array}
     */
    encrypt: async (password, plaintext) => {
        let key = await aes.generateKey(password),
            algo = aes.getAlgorthm(),
            encoder = new TextEncoder();

        let encrypted = new Uint8Array(await crypto.subtle.encrypt(algo, key, encoder.encode(plaintext)));
        let output = new Uint8Array(v1.header.length + algo.iv.length + encrypted.length);
        output.set(v1.header)
        output.set(algo.iv, v1.header.length);
        output.set(encrypted, v1.header.length + algo.iv.length);

        return output;
    },
    /**
     * @param {String} password
     * @param {Uint8Array} encrypted
     * @return {string}
     */
    decrypt: async (password, encrypted) => {
        let iv = encrypted.subarray(v1.header.length, v1.header.length + aes.IV_SIZE),
            key = await aes.generateKey(password),
            algo = aes.getAlgorthm(iv);

        encrypted = encrypted.subarray(v1.header.length + aes.IV_SIZE);

        let output = await crypto.subtle.decrypt(algo, key, encrypted);
        return new TextDecoder().decode(output);
    }
}

const algos = [v1];
class Encryption {
    /**
     * Encrypt the provided data with the most recent file format.
     *
     * @param {String} password
     * @param {String} plaintext
     * @returns {Uint8Array}
     */
    static async encrypt (password, plaintext) { return algos[algos.length - 1].encrypt(password, plaintext) }

    /**
     * Attempt to decrypt the provided data by sniffing it's format.
     *
     * @param {String} password
     * @param {Uint8Array} encrypted
     * @return {string}
     */
    static async decrypt (password, encrypted) {
        let matches = algos.filter(a => {
            for (let b = 0; b < a.header.length; b++) {
                if (encrypted[b] !== a.header[b]) {
                    return false;
                }
            }
            return true;
        });

        switch (matches.length) {
            case 0: throw new Error("Backup not supported.");
            case 1: return matches[0].decrypt(password, encrypted);
            default: throw new Error("More than one algorithm matched the data.");
        }
    }

    /**
     * Get export file version.
     *
     * @param {Uint8Array} bytes
     */
    static async version(bytes) {
        return new Promise(resolve => {
            for (let b = 0; b < header.length; b++) {
                if (bytes[b] !== header[b]) {
                    resolve(null);
                }
            }

            if (bytes[8] !== 0xff) {
                resolve(null);
            }

            if (bytes[15] !== 0xff) {
                resolve(null);
            }

            let version = "";
            for (let b = 10; b < 15; b++) {
                if (bytes[b] === 0x00 && version === "")
                    continue;

                if (version !== "") {
                    version +=  ".";
                }

                version += bytes[b];
            }

            if (version === "") {
                resolve(null);
            }

            resolve(version);
        });
    }
}

export { Encryption };