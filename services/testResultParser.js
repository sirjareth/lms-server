const fs = require('fs');
const path = require('path');
const { parseStringPromise } = require('xml2js');

/**
 * Parses JUnit XML report files (e.g. Surefire report XML files).
 * @param {string} xmlString - Raw XML content of a surefire report.
 * @returns {Promise<Object>} - Parsed result containing testsTotal, testsPassed, tests array, errorType, and outputLog.
 */
async function parseJUnitXml(xmlString) {
  try {
    const result = await parseStringPromise(xmlString);
    const testsuite = result.testsuite || (result.testsuites && result.testsuites.testsuite ? result.testsuites.testsuite[0] : null);

    if (!testsuite) {
      return {
        testsTotal: 0,
        testsPassed: 0,
        tests: [],
        errorType: 'compile',
        outputLog: 'No JUnit testsuite found in XML output.'
      };
    }

    const attrs = testsuite.$ || {};
    const testsTotal = parseInt(attrs.tests || '0', 10);
    const failures = parseInt(attrs.failures || '0', 10);
    const errors = parseInt(attrs.errors || '0', 10);
    const testsPassed = Math.max(0, testsTotal - failures - errors);

    const testcases = testsuite.testcase || [];
    const tests = testcases.map((tc) => {
      const name = tc.$.name || 'Unnamed Test';
      const hasFailure = tc.failure || tc.error;
      const details = hasFailure
        ? (tc.failure ? tc.failure[0]._ || tc.failure[0].$.message : tc.error[0]._ || tc.error[0].$.message) || 'Failed'
        : 'Passed';

      return {
        name,
        passed: !hasFailure,
        details
      };
    });

    return {
      testsTotal,
      testsPassed,
      tests,
      errorType: null,
      outputLog: `JUnit run finished: ${testsPassed}/${testsTotal} passed.`
    };
  } catch (err) {
    return {
      testsTotal: 0,
      testsPassed: 0,
      tests: [],
      errorType: 'compile',
      outputLog: `Failed to parse JUnit XML: ${err.message}`
    };
  }
}

module.exports = { parseJUnitXml };
