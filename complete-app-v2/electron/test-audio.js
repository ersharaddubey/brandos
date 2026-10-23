/**
 * FILE: electron/test-audio.js
 * PURPOSE: Test audio source detection from Electron main process
 * RUN: node test-audio.js (will not work alone)
 * RUN: Use electron . --test-audio or add to main.js
 */

const { desktopCapturer } = require('electron');

async function testAudioSources() {
  console.log('🔍 Testing audio sources...');
  
  try {
    const sources = await desktopCapturer.getSources({
      types: ['audio'],
      thumbnailSize: { width: 0, height: 0 },
    });
    
    console.log(`📡 Found ${sources.length} audio sources:`);
    sources.forEach((s, i) => {
      console.log(`  ${i+1}. ${s.name} (${s.id})`);
    });
    
    return sources;
  } catch (err) {
    console.error('❌ Error:', err.message);
    return [];
  }
}

// Only run if called directly (not from main.js)
if (require.main === module) {
  console.log('⚠️ This file must be run from Electron main process.');
  console.log('Add to main.js:');
  console.log('  const { testAudioSources } = require("./test-audio");');
  console.log('  testAudioSources();');
}

module.exports = { testAudioSources };