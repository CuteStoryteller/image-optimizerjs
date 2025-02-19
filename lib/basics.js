/**
 * Copyright (c) 2025 CuteStoryteller
 * All Rights Reserved. MIT License
 */

'use strict';

const sharp = require('sharp');
const download = require('image-downloader');
const fs = require('fs').promises;
const path = require('path');
const is = require('./is.js');

/**
 * Get format of an image.
 * 
 * @param {string} path - path or url
 * @returns {string}
 */
function getFormat(path) {
    is.invalidType('path', 'string', path);

    const format = path.match(/\.(png|svg|jpg|jpeg|gif)/)?.[0];

    if (!format) {
        throw new Error(`${path} is not an image`);
    }

    return format;
}

/**
 * Compose a preferred path for a product image where it should be downloaded.
 * 
 * @param {string} url - image URL.
 * @param {string} dir - directory path.
 * @param {string} id - product ID.
 * @param {number} i - index of the image among all images of a product.
 * @returns {string}
 * @private
 */
function composePreferredPath(url, dir, id, i) {
    return path.join(dir, id + '-' + i + getFormat(url));
}

/**
 * Download product images to designated paths.
 * 
 * @param {Array<string>} urls - product images URLs.
 * @param {string} dir - directory path.
 * @param {string} id - product ID.
 * @returns {Promise<Array<string>>} paths of successfully downloaded images.
 */
async function downloadProductImages(urls, dir, id) {
    is.invalidType('urls', 'array', urls);
    is.invalidType('dir', 'string', dir);
    is.invalidType('id', 'string', id);

    const paths = [];
   
    for (let i = 0; i < urls.length; i++) {
        try {
            const path = composePreferredPath(urls[i], dir, id, i);
            await download.image({ url: urls[i], dest: path });
            paths.push(path);
        } catch (e) {
            continue;
        }
    }

    return paths;
}

/**
 * @param {Array<string>} paths
 * @return {Promise<void>}
 */
async function deleteImages(paths) {
    is.invalidType('paths', 'array', paths);

    for (const path of paths) {
        try {
            is.invalidType('path', 'string', path);
            await fs.unlink(path);
        } catch (e) {
            continue;
        }
    }
}

/**
 * @param {string} path 
 * @returns {Promise<number>}
 */
async function getImageSize(path) {
    is.invalidType('path', 'string', path);

    const { size } = await fs.stat(path);
    return size;
}

/**
 * @param {string} path 
 * @returns {Promise<{width: number, height: number}>}
 */
async function getImageDimensions(path) {
    is.invalidType('path', 'string', path);

    const data = await fs.readFile(path);
    const { width, height } = await sharp(data).metadata();
    return { width, height };
}

module.exports = {
    getFormat,
    downloadProductImages,
    deleteImages,
    getImageSize,
    getImageDimensions
};