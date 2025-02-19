/**
 * Copyright (c) 2025 CuteStoryteller
 * All Rights Reserved. MIT License
 */

'use strict';

const sharp = require('sharp');
const fs = require('fs').promises;
const { getFormat, getImageSize, getImageDimensions } = require('./basics.js');
const is = require('./is.js');

/**
 * Calculate optimal dimensions of an image.
 * 
 * New image dimensions will be less or equal then maxDimensions but as large as possible while preserving aspect ratio.
 * If current dimensions already satisfy the condition, nothing changes.
 * 
 * @param {Object} dimensions - current image dimensions.
 * @param {number} dimensions.width
 * @param {number} dimensions.height
 * @param {Object} maxDimensions
 * @param {number} maxDimensions.maxWidth
 * @param {number} maxDimensions.maxHeight
 * @returns {{width: number, height: number}}
 * @private
 */
function calculateOptimalDimensions(dimensions, maxDimensions) {
    is.invalidType('dimensions', 'object', dimensions);
    is.invalidType('maxDimensions', 'object', maxDimensions);

    const { width, height } = dimensions;
    const { maxWidth, maxHeight } = maxDimensions;

    is.invalidType('width', 'number', width);
    is.invalidType('height', 'number', height);
    is.invalidType('maxWidth', 'number', maxWidth);
    is.invalidType('maxHeight', 'number', maxHeight);

    const k = Math.min(1, maxWidth / width, maxHeight / height);
        
    return {
        width: Math.floor(width * k),
        height: Math.floor(height * k)
    }
}

/**
 * Convert an image to jpeg/jpg.
 * 
 * If the current image is already jpeg/jpg, nothing changes.
 * 
 * @param {string} path
 * @param {boolean} autoDelete - delete an initial image if a new one is created.
 * @returns {Promise<string>} new path
 */
async function convertToJpeg(path, autoDelete = false) {
    is.invalidType('path', 'string', path);

    const format = getFormat(path);

    if (['.jpeg', '.jpg'].includes(format)) return path;

    const newPath = path.replace(format, '.jpeg');
    const data = await fs.readFile(path);

    await sharp(data)
            .jpeg({
                quality: 100,
                chromaSubsampling: '4:4:4',
            })
            .toFile(newPath);

    if (autoDelete) await fs.unlink(path);

    return newPath;
}

/**
 * Resize an image preserving aspect ratio.
 * 
 * New image dimensions will be less or equal then maxDimensions but as large as possible.
 * If current dimensions already satisfy the condition, nothing changes.
 * 
 * @param {string} path
 * @param {{maxWidth: number, maxHeight: number}} maxDimensions
 * @param {boolean} autoDelete - delete an initial image if a new one is created.
 * @returns {Promise<string>} new path
 */
async function resizePreservingAspectRatio(path, maxDimensions, autoDelete = false) {
    is.invalidType('path', 'string', path);
    is.invalidType('maxDimensions', 'object', maxDimensions);

    const { maxWidth, maxHeight } = maxDimensions;

    is.invalidType('maxWidth', 'number', maxWidth);
    is.invalidType('maxHeight', 'number', maxHeight);

    const { width, height } = await getImageDimensions(path);

    if (width <= maxWidth && height <= maxHeight) return path;

    const newDimensions = calculateOptimalDimensions({ width, height }, maxDimensions);
    const newPath = path.replace('.', '-resized.');
    const data = await fs.readFile(path);

    await sharp(data)
        .resize(newDimensions.width, newDimensions.height)
        .toFile(newPath);

    if (autoDelete) await fs.unlink(path);

    return newPath;
}

/**
 * Compress a jpeg image.
 * 
 * New image size will be less or equal then maxSize but as large as possible.
 * If the current size already satisfy the condition, nothing changes.
 * 
 * @async
 * @param {string} path 
 * @param {number} maxSize
 * @param {boolean} autoDelete - delete an initial image if a new one is created.
 * @returns {Promise<string>} new path
 */
async function compressJpeg(path, maxSize, autoDelete = false) {
    is.invalidType('path', 'string', path);
    is.invalidType('maxSize', 'number', maxSize);

    const data = await fs.readFile(path);
    const sharpInstance = sharp(data);

    if (await getImageSize(path) <= maxSize) return path;

    const newPath = path.replace('.', '-compressed.');

    let left = 1;
    let right = 100;
    let quality;

    while (right - left > 1) {
        quality = Math.floor((left + right) / 2);

        await sharpInstance.jpeg({
                quality,
                chromaSubsampling: '4:4:4' })
            .toFile(newPath);

        if (await getImageSize(newPath) < maxSize) {
            left = quality;
        } else {
            right = quality;
        }
    }

    await sharpInstance.jpeg({
            quality: left,
            chromaSubsampling: '4:4:4'
        })
        .toFile(newPath);

    if (autoDelete) await fs.unlink(path);

    return newPath;
}

/**
 * Convert images to jpeg, compress and resize them.
 * 
 * @async
 * @param {Array<string>} paths
 * @param {Object} maxMetadata
 * @param {number} maxMetadata.maxWidth
 * @param {number} maxMetadata.maxHeight
 * @param {number} maxMetadata.maxSize
 * @returns {Promise<Array<string>>} new paths.
 */
async function optimizeImages(paths, maxMetadata) {
    is.invalidType('paths', 'array', paths);
    is.invalidType('maxMetadata', 'object', maxMetadata);

    const { maxWidth, maxHeight, maxSize } = maxMetadata;
    const newPaths = [];

    for (const path of paths) {
        try {
            const jpegPath = await convertToJpeg(path, true);
            const resizedPath = await resizePreservingAspectRatio(jpegPath, { maxWidth, maxHeight }, true);
            const compressedPath = await compressJpeg(resizedPath, maxSize, true);
            
            await fs.rename(compressedPath, jpegPath);

            newPaths.push(jpegPath);
        } catch(e) {
            continue;
        }
    }

    return newPaths;
}

module.exports = {
    convertToJpeg,
    resizePreservingAspectRatio,
    compressJpeg,
    optimizeImages
};