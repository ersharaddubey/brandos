// Tile sizes for the mixed-size gallery mosaic
export const SIZES = [['auto', 'Auto (mixed)'], ['small', 'Small'], ['wide', 'Wide'], ['tall', 'Tall'], ['large', 'Large']];

// "Auto" photos follow this repeating pattern so a bulk upload still looks varied
const AUTO = ['large', 'small', 'tall', 'small', 'wide', 'small', 'small', 'tall', 'small', 'wide'];
export const sizeOf = (size, i) => (size && size !== 'auto' ? size : AUTO[i % AUTO.length]);

export const SPAN = { small: '', wide: 'col-span-2', tall: 'row-span-2', large: 'col-span-2 row-span-2' };
export const MOSAIC = 'grid grid-flow-dense auto-rows-[150px] grid-cols-2 gap-3 sm:auto-rows-[180px] md:auto-rows-[210px] md:grid-cols-4 md:gap-4 2xl:grid-cols-5';
