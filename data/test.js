const axios = require('axios');
const fs = require('fs');
const path = require('path');

async function testFastAPIHealth() {
  try {
    console.log('Testing FastAPI health endpoint...');
    const response = await axios.get('http://127.0.0.1:3333/healthz');
    console.log('FastAPI health check response:', response.data);
    console.log('Status:', response.status);
    return response.data;
  } catch (error) {
    console.error('Error testing FastAPI health:', error.message);
    throw error;
  }
}

async function testMbrVsbChkFs() {
  try {
    console.log('Testing /mbr-vsb-chk-fs endpoint...');
    
    // Find input files in data folder
    const dataDir = __dirname;
    const files = fs.readdirSync(dataDir);
    const inputFiles = files.filter(f => f.startsWith('mbr') || f.includes('Goal'));
    const inputPaths = inputFiles.map(f => path.join(dataDir, f));
    
    console.log('Input files found:', inputPaths);
    
    if (inputPaths.length === 0) {
      throw new Error('No input files found in data folder');
    }
    
    // Call FastAPI endpoint
    const response = await axios.post('http://127.0.0.1:3333/mbr-vsb-chk-fs', {
      filepaths: inputPaths
    });
    
    console.log('FastAPI response:', response.data);
    
    // Copy output file to data folder
    const outputFile = response.data.output_file;
    if (outputFile && fs.existsSync(outputFile)) {
      const dataOutputPath = path.join(dataDir, 'output.csv');
      fs.copyFileSync(outputFile, dataOutputPath);
      console.log('Output saved to:', dataOutputPath);
      return dataOutputPath;
    } else {
      throw new Error('Output file not found');
    }
  } catch (error) {
    console.error('Error testing mbr-vsb-chk-fs:', error.message);
    throw error;
  }
}

// Run the tests
async function runTests() {
  try {
    // Test health first
    await testFastAPIHealth();
    console.log('Health check passed\n');
    
    // Test mbr-vsb-chk-fs
    const outputPath = await testMbrVsbChkFs();
    console.log('MbrVsbChk test completed successfully');
    console.log('Output file:', outputPath);
    
    process.exit(0);
  } catch (error) {
    console.error('Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
