// Test script to verify the new image generation flow
const imageGenerationService = require('./services/imageGenerationService');

async function testProviders() {
  console.log('🔍 Testing image generation providers...\n');

  try {
    // Test provider validation
    console.log('✅ Testing provider validation:');
    console.log('OpenAI valid:', await imageGenerationService.validateProvider('openai'));
    console.log('Gemini valid:', await imageGenerationService.validateProvider('gemini'));
    console.log('Invalid valid:', await imageGenerationService.validateProvider('invalid'));
    console.log();

    // Test provider status
    console.log('✅ Testing provider status:');
    const openaiStatus = await imageGenerationService.getProviderStatus('openai');
    const geminiStatus = await imageGenerationService.getProviderStatus('gemini');
    console.log('OpenAI status:', openaiStatus);
    console.log('Gemini status:', geminiStatus);
    console.log();

    // Test available providers
    console.log('✅ Available providers:');
    const providers = imageGenerationService.getAvailableProviders();
    console.log(providers);
    console.log();

    // Test provider capabilities
    console.log('✅ Provider capabilities:');
    const openaiCaps = imageGenerationService.getProviderCapabilities('openai');
    const geminiCaps = imageGenerationService.getProviderCapabilities('gemini');
    console.log('OpenAI:', openaiCaps);
    console.log('Gemini:', geminiCaps);
    console.log();

    console.log('✅ All provider tests completed successfully!');

  } catch (error) {
    console.error('❌ Error testing providers:', error.message);
  }
}

async function testImageGeneration() {
  console.log('🎨 Testing image generation...\n');

  const testParams = {
    provider: 'openai',
    topic: 'Modern coffee shop interior with warm lighting',
    userId: 'test-user-123',
    aspectRatio: '1:1',
    style: 'professional',
    quality: 'hd',
    saveToFirebase: false // Set to true for actual Firebase upload
  };

  try {
    console.log('🔄 Generating test image with params:', {
      provider: testParams.provider,
      topic: testParams.topic,
      aspectRatio: testParams.aspectRatio,
      style: testParams.style
    });

    // Note: This will use placeholder URLs in development
    const result = await imageGenerationService.generateImage(testParams);
    
    console.log('✅ Image generated successfully:');
    console.log('URL:', result.url);
    console.log('Provider:', result.provider);
    console.log('Model:', result.model);
    console.log('Generation time:', result.generationTime, 'ms');
    console.log('Revised prompt:', result.revisedPrompt);
    console.log();

    // Test variations
    console.log('🔄 Testing variations...');
    const variations = await imageGenerationService.generateImageWithVariations({
      ...testParams,
      variations: 2
    }, 2);
    
    console.log(`✅ Generated ${variations.length} variations`);
    variations.forEach((variation, index) => {
      console.log(`Variation ${index + 1}:`, variation.url);
    });

  } catch (error) {
    console.error('❌ Error generating image:', error.message);
  }
}

// Run tests if called directly
if (require.main === module) {
  (async () => {
    await testProviders();
    console.log('\n' + '='.repeat(50) + '\n');
    await testImageGeneration();
    process.exit(0);
  })();
}

module.exports = { testProviders, testImageGeneration };