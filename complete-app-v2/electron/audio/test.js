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

testAudioSources();