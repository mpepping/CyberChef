import Utils from "../Utils.js";
import CryptoApi from "crypto-api";
import MD6 from "node-md6";
import * as SHA3 from "js-sha3";
import Checksum from "./Checksum.js";


/**
 * Hashing operations.
 *
 * @author n1474335 [n1474335@gmail.com]
 * @copyright Crown Copyright 2016
 * @license Apache-2.0
 *
 * @namespace
 */
const Hash = {

    /**
     * Generic hash function.
     *
     * @param {string} name
     * @param {string} input
     * @returns {string}
     */
    runHash: function(name, input) {
        const hasher = CryptoApi.hasher(name);
        hasher.state.message = input;
        hasher.state.length += input.length;
        hasher.process();
        return hasher.finalize().stringify("hex");
    },


    /**
     * MD2 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runMD2: function (input, args) {
        return Hash.runHash("md2", input);
    },


    /**
     * MD4 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runMD4: function (input, args) {
        return Hash.runHash("md4", input);
    },


    /**
     * MD5 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runMD5: function (input, args) {
        return Hash.runHash("md5", input);
    },


    /**
     * @constant
     * @default
     */
    MD6_SIZE: 256,
    /**
     * @constant
     * @default
     */
    MD6_LEVELS: 64,

    /**
     * MD6 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runMD6: function (input, args) {
        const size = args[0],
            levels = args[1],
            key = args[2];

        if (size < 0 || size > 512)
            return "Size must be between 0 and 512";
        if (levels < 0)
            return "Levels must be greater than 0";

        return MD6.getHashOfText(input, size, key, levels);
    },


    /**
     * SHA0 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runSHA0: function (input, args) {
        return Hash.runHash("sha0", input);
    },


    /**
     * SHA1 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runSHA1: function (input, args) {
        return Hash.runHash("sha1", input);
    },


    /**
     * @constant
     * @default
     */
    SHA2_SIZE: ["512", "256", "384", "224", "512/256", "512/224"],

    /**
     * SHA2 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runSHA2: function (input, args) {
        const size = args[0];
        return Hash.runHash("sha" + size, input);
    },


    /**
     * @constant
     * @default
     */
    SHA3_SIZE: ["512", "384", "256", "224"],

    /**
     * SHA3 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runSHA3: function (input, args) {
        const size = parseInt(args[0], 10);
        let algo;

        switch (size) {
            case 224:
                algo = SHA3.sha3_224;
                break;
            case 384:
                algo = SHA3.sha3_384;
                break;
            case 256:
                algo = SHA3.sha3_256;
                break;
            case 512:
                algo = SHA3.sha3_512;
                break;
            default:
                return "Invalid size";
        }

        return algo(input);
    },


    /**
     * @constant
     * @default
     */
    KECCAK_SIZE: ["512", "384", "256", "224"],

    /**
     * Keccak operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runKeccak: function (input, args) {
        const size = parseInt(args[0], 10);
        let algo;

        switch (size) {
            case 224:
                algo = SHA3.keccak224;
                break;
            case 384:
                algo = SHA3.keccak384;
                break;
            case 256:
                algo = SHA3.keccak256;
                break;
            case 512:
                algo = SHA3.keccak512;
                break;
            default:
                return "Invalid size";
        }

        return algo(input);
    },


    /**
     * @constant
     * @default
     */
    SHAKE_CAPACITY: ["256", "128"],
    /**
     * @constant
     * @default
     */
    SHAKE_SIZE: 512,

    /**
     * Shake operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runShake: function (input, args) {
        const capacity = parseInt(args[0], 10),
            size = args[1];
        let algo;

        if (size < 0)
            return "Size must be greater than 0";

        switch (capacity) {
            case 128:
                algo = SHA3.shake128;
                break;
            case 256:
                algo = SHA3.shake256;
                break;
            default:
                return "Invalid size";
        }

        return algo(input, size);
    },


    /**
     * @constant
     * @default
     */
    RIPEMD_SIZE: ["320", "256", "160", "128"],

    /**
     * RIPEMD operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runRIPEMD: function (input, args) {
        const size = args[0];
        return Hash.runHash("ripemd" + size, input);
    },


    /**
     * HAS-160 operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runHAS: function (input, args) {
        return Hash.runHash("has160", input);
    },


    /**
     * @constant
     * @default
     */
    WHIRLPOOL_VARIANT: ["Whirlpool", "Whirlpool-T", "Whirlpool-0"],

    /**
     * Whirlpool operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runWhirlpool: function (input, args) {
        const variant = args[0].toLowerCase();
        return Hash.runHash(variant, input);
    },


    /**
     * @constant
     * @default
     */
    SNEFRU_ROUNDS: ["8", "4", "2"],
    /**
     * @constant
     * @default
     */
    SNEFRU_SIZE: ["256", "128"],

    /**
     * Snefru operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runSnefru: function (input, args) {
        const rounds = args[0],
            size = args[1];
        return Hash.runHash(`snefru-${rounds}-${size}`, input);
    },


    /**
     * @constant
     * @default
     */
    HMAC_FUNCTIONS: [
        "MD2",
        "MD4",
        "MD5",
        "SHA0",
        "SHA1",
        "SHA224",
        "SHA256",
        "SHA384",
        "SHA512",
        "SHA512/224",
        "SHA512/256",
        "RIPEMD128",
        "RIPEMD160",
        "RIPEMD256",
        "RIPEMD320",
        "HAS160",
        "Whirlpool",
        "Whirlpool-0",
        "Whirlpool-T"
    ],

    /**
     * HMAC operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runHMAC: function (input, args) {
        const password = args[0],
            hashFunc = args[1].toLowerCase(),
            hmac = CryptoApi.mac("hmac", password, hashFunc, {});

        hmac.update(input);
        return hmac.finalize().stringify("hex");
    },


    /**
     * Generate all hashes operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runAll: function (input, args) {
        let byteArray = Utils.strToByteArray(input),
            output = "MD2:         " + Hash.runMD2(input, []) +
                "\nMD4:         " + Hash.runMD4(input, []) +
                "\nMD5:         " + Hash.runMD5(input, []) +
                "\nMD6:         " + Hash.runMD6(input, []) +
                "\nSHA0:        " + Hash.runSHA0(input, []) +
                "\nSHA1:        " + Hash.runSHA1(input, []) +
                "\nSHA2 224:    " + Hash.runSHA2(input, ["224"]) +
                "\nSHA2 256:    " + Hash.runSHA2(input, ["256"]) +
                "\nSHA2 384:    " + Hash.runSHA2(input, ["384"]) +
                "\nSHA2 512:    " + Hash.runSHA2(input, ["512"]) +
                "\nSHA3 224:    " + Hash.runSHA3(input, ["224"]) +
                "\nSHA3 256:    " + Hash.runSHA3(input, ["256"]) +
                "\nSHA3 384:    " + Hash.runSHA3(input, ["384"]) +
                "\nSHA3 512:    " + Hash.runSHA3(input, ["512"]) +
                "\nKeccak 224:  " + Hash.runKeccak(input, ["224"]) +
                "\nKeccak 256:  " + Hash.runKeccak(input, ["256"]) +
                "\nKeccak 384:  " + Hash.runKeccak(input, ["384"]) +
                "\nKeccak 512:  " + Hash.runKeccak(input, ["512"]) +
                "\nShake 128:   " + Hash.runShake(input, ["128", 256]) +
                "\nShake 256:   " + Hash.runShake(input, ["256", 512]) +
                "\nRIPEMD-128:  " + Hash.runRIPEMD(input, ["128"]) +
                "\nRIPEMD-160:  " + Hash.runRIPEMD(input, ["160"]) +
                "\nRIPEMD-256:  " + Hash.runRIPEMD(input, ["256"]) +
                "\nRIPEMD-320:  " + Hash.runRIPEMD(input, ["320"]) +
                "\nHAS-160:     " + Hash.runHAS(input, []) +
                "\nWhirlpool-0: " + Hash.runWhirlpool(input, ["Whirlpool-0"]) +
                "\nWhirlpool-T: " + Hash.runWhirlpool(input, ["Whirlpool-T"]) +
                "\nWhirlpool:   " + Hash.runWhirlpool(input, ["Whirlpool"]) +
                "\n\nChecksums:" +
                "\nFletcher-8:  " + Checksum.runFletcher8(byteArray, []) +
                "\nFletcher-16: " + Checksum.runFletcher16(byteArray, []) +
                "\nFletcher-32: " + Checksum.runFletcher32(byteArray, []) +
                "\nFletcher-64: " + Checksum.runFletcher64(byteArray, []) +
                "\nAdler-32:    " + Checksum.runAdler32(byteArray, []) +
                "\nCRC-16:      " + Checksum.runCRC16(input, []) +
                "\nCRC-32:      " + Checksum.runCRC32(input, []);

        return output;
    },


    /**
     * Analyse hash operation.
     *
     * @param {string} input
     * @param {Object[]} args
     * @returns {string}
     */
    runAnalyse: function(input, args) {
        input = input.replace(/\s/g, "");

        let output = "",
            byteLength = input.length / 2,
            bitLength = byteLength * 8,
            possibleHashFunctions = [];

        if (!/^[a-f0-9]+$/i.test(input)) {
            return "Invalid hash";
        }

        output += "Hash length: " + input.length + "\n" +
            "Byte length: " + byteLength + "\n" +
            "Bit length:  " + bitLength + "\n\n" +
            "Based on the length, this hash could have been generated by one of the following hashing functions:\n";

        switch (bitLength) {
            case 4:
                possibleHashFunctions = [
                    "Fletcher-4",
                    "Luhn algorithm",
                    "Verhoeff algorithm",
                ];
                break;
            case 8:
                possibleHashFunctions = [
                    "Fletcher-8",
                ];
                break;
            case 16:
                possibleHashFunctions = [
                    "BSD checksum",
                    "CRC-16",
                    "SYSV checksum",
                    "Fletcher-16"
                ];
                break;
            case 32:
                possibleHashFunctions = [
                    "CRC-32",
                    "Fletcher-32",
                    "Adler-32",
                ];
                break;
            case 64:
                possibleHashFunctions = [
                    "CRC-64",
                    "RIPEMD-64",
                    "SipHash",
                ];
                break;
            case 128:
                possibleHashFunctions = [
                    "MD5",
                    "MD4",
                    "MD2",
                    "HAVAL-128",
                    "RIPEMD-128",
                    "Snefru",
                    "Tiger-128",
                ];
                break;
            case 160:
                possibleHashFunctions = [
                    "SHA-1",
                    "SHA-0",
                    "FSB-160",
                    "HAS-160",
                    "HAVAL-160",
                    "RIPEMD-160",
                    "Tiger-160",
                ];
                break;
            case 192:
                possibleHashFunctions = [
                    "Tiger",
                    "HAVAL-192",
                ];
                break;
            case 224:
                possibleHashFunctions = [
                    "SHA-224",
                    "SHA3-224",
                    "ECOH-224",
                    "FSB-224",
                    "HAVAL-224",
                ];
                break;
            case 256:
                possibleHashFunctions = [
                    "SHA-256",
                    "SHA3-256",
                    "BLAKE-256",
                    "ECOH-256",
                    "FSB-256",
                    "GOST",
                    "Grøstl-256",
                    "HAVAL-256",
                    "PANAMA",
                    "RIPEMD-256",
                    "Snefru",
                ];
                break;
            case 320:
                possibleHashFunctions = [
                    "RIPEMD-320",
                ];
                break;
            case 384:
                possibleHashFunctions = [
                    "SHA-384",
                    "SHA3-384",
                    "ECOH-384",
                    "FSB-384",
                ];
                break;
            case 512:
                possibleHashFunctions = [
                    "SHA-512",
                    "SHA3-512",
                    "BLAKE-512",
                    "ECOH-512",
                    "FSB-512",
                    "Grøstl-512",
                    "JH",
                    "MD6",
                    "Spectral Hash",
                    "SWIFFT",
                    "Whirlpool",
                ];
                break;
            case 1024:
                possibleHashFunctions = [
                    "Fowler-Noll-Vo",
                ];
                break;
            default:
                possibleHashFunctions = [
                    "Unknown"
                ];
                break;
        }

        return output + possibleHashFunctions.join("\n");
    },

};

export default Hash;
