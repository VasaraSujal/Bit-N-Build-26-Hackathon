const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

async function runTests() {
  console.log('--- Starting Automated Club Logo Feature Verification ---');

  const superAdminToken = jwt.sign(
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'superadmin@clubops.ai',
      role: 'SUPER_ADMIN'
    },
    process.env.JWT_SECRET || 'clubops_jwt_secret_secure_key_2026_super_hackathon',
    { expiresIn: '1h' }
  );

  const volunteerToken = jwt.sign(
    {
      id: '00000000-0000-0000-0000-000000000002',
      email: 'volunteer@example.com',
      role: 'VOLUNTEER'
    },
    process.env.JWT_SECRET || 'clubops_jwt_secret_secure_key_2026_super_hackathon',
    { expiresIn: '1h' }
  );

  const baseUrl = 'http://localhost:5000/api';
  let createdClubId = null;

  try {
    // 1. Health check
    console.log('\n[Test 1] Health Check...');
    const healthRes = await fetch(`${baseUrl}/health`);
    const healthData = await healthRes.json();
    console.log('Health Response:', healthData);
    if (!healthData.success) throw new Error('API not healthy');

    // 2. Authorization check (Volunteer cannot create club)
    console.log('\n[Test 2] Authorization Check (Volunteer should be 403)...');
    const authTestRes = await fetch(`${baseUrl}/clubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${volunteerToken}`
      },
      body: JSON.stringify({ name: 'Unauthorized Club' })
    });
    console.log('Volunteer status:', authTestRes.status);
    if (authTestRes.status !== 403) throw new Error(`Expected 403 Forbidden, got ${authTestRes.status}`);

    // 3. Create Club with URL mode
    console.log('\n[Test 3] Create Club with Web URL Mode...');
    const clubName = `Test Club URL ${Date.now()}`;
    const testUrl = 'https://example.com/test-club-logo.png';
    const createUrlRes = await fetch(`${baseUrl}/clubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: clubName,
        description: 'A club created with direct URL',
        logoUrl: testUrl
      })
    });
    const createUrlData = await createUrlRes.json();
    console.log('Create URL Status:', createUrlRes.status, createUrlData);
    if (createUrlRes.status !== 201 || createUrlData.data?.club?.logoUrl !== testUrl) {
      throw new Error('URL mode creation failed');
    }
    createdClubId = createUrlData.data.club.id;

    // 4. Verify in Database that URL is stored directly
    console.log('\n[Test 4] Direct Database verification...');
    const dbCheck = await pool.query('SELECT name, logo_url FROM clubs WHERE id = $1', [createdClubId]);
    console.log('DB Row:', dbCheck.rows[0]);
    if (dbCheck.rows[0].logo_url !== testUrl) {
      throw new Error(`DB logo_url does not match: expected ${testUrl}, got ${dbCheck.rows[0].logo_url}`);
    }

    // 5. Mutual Exclusivity Check (multipart with both URL and file)
    console.log('\n[Test 5] Mutual Exclusivity Check (both URL and file in FormData)...');
    const formDataMutual = new FormData();
    formDataMutual.append('name', `Test Mutual ${Date.now()}`);
    formDataMutual.append('logoUrl', 'https://example.com/logo.png');
    // fake dummy png blob
    const dummyBlob = new Blob([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], { type: 'image/png' });
    formDataMutual.append('logo', dummyBlob, 'test.png');

    const mutualRes = await fetch(`${baseUrl}/clubs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superAdminToken}`
      },
      body: formDataMutual
    });
    const mutualData = await mutualRes.json();
    console.log('Mutual status:', mutualRes.status, mutualData);
    if (mutualRes.status !== 400 || !mutualData.message.includes('not both')) {
      throw new Error('Mutual exclusivity validation failed');
    }

    // 6. Invalid File Type Check (uploading text file)
    console.log('\n[Test 6] Invalid File Type Validation...');
    const formDataInvalidType = new FormData();
    formDataInvalidType.append('name', `Test Invalid Type ${Date.now()}`);
    const txtBlob = new Blob(['hello text'], { type: 'text/plain' });
    formDataInvalidType.append('logo', txtBlob, 'test.txt');

    const invalidTypeRes = await fetch(`${baseUrl}/clubs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superAdminToken}`
      },
      body: formDataInvalidType
    });
    const invalidTypeData = await invalidTypeRes.json();
    console.log('Invalid Type status:', invalidTypeRes.status, invalidTypeData);
    if (invalidTypeRes.status !== 400 || !invalidTypeData.message.includes('JPG, PNG, or WebP')) {
      throw new Error('Invalid file type rejection failed');
    }

    // 6b. Local Image Upload to Cloudinary Check
    console.log('\n[Test 6b] Local Image Upload Mode (Cloudinary)...');
    const validPngBuffer = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    const formDataCloudinary = new FormData();
    const cldClubName = `Test Cloudinary Club ${Date.now()}`;
    formDataCloudinary.append('name', cldClubName);
    formDataCloudinary.append('description', 'Club with Cloudinary uploaded logo');
    formDataCloudinary.append('logo', new Blob([validPngBuffer], { type: 'image/png' }), 'club-logo.png');

    const cldRes = await fetch(`${baseUrl}/clubs`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${superAdminToken}`
      },
      body: formDataCloudinary
    });
    const cldData = await cldRes.json();
    console.log('Cloudinary Upload status:', cldRes.status, cldData);
    if (cldRes.status !== 201 || !cldData.data?.club?.logoUrl?.includes('cloudinary.com')) {
      throw new Error('Cloudinary upload creation failed');
    }
    const cldClubId = cldData.data.club.id;

    // 7. Invalid URL Check
    console.log('\n[Test 7] Invalid URL Validation...');
    const invalidUrlRes = await fetch(`${baseUrl}/clubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: `Test Invalid URL ${Date.now()}`,
        logoUrl: 'not-a-valid-url'
      })
    });
    const invalidUrlData = await invalidUrlRes.json();
    console.log('Invalid URL status:', invalidUrlRes.status, invalidUrlData);
    if (invalidUrlRes.status !== 400) {
      throw new Error('Invalid URL rejection failed');
    }

    // 8. Create Club with No Logo (Initials Fallback flow)
    console.log('\n[Test 8] Create Club with No Logo...');
    const noLogoName = `Developer Student Club ${Date.now()}`;
    const noLogoRes = await fetch(`${baseUrl}/clubs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: noLogoName,
        description: 'A club without logo'
      })
    });
    const noLogoData = await noLogoRes.json();
    console.log('No logo status:', noLogoRes.status, noLogoData);
    if (noLogoRes.status !== 201 || noLogoData.data?.club?.logoUrl !== null) {
      throw new Error('No logo creation failed');
    }
    const noLogoClubId = noLogoData.data.club.id;

    // 9. Edit Club - Replace with new URL
    console.log('\n[Test 9] Edit Club - Replace with new URL...');
    const newUrl = 'https://example.com/updated-logo.png';
    const editUrlRes = await fetch(`${baseUrl}/clubs/${createdClubId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: clubName + ' Updated',
        logoUrl: newUrl
      })
    });
    const editUrlData = await editUrlRes.json();
    console.log('Edit URL status:', editUrlRes.status, editUrlData);
    if (editUrlRes.status !== 200 || editUrlData.data?.club?.logoUrl !== newUrl) {
      throw new Error('Edit URL failed');
    }

    // 10. Edit Club - Explicitly remove logo
    console.log('\n[Test 10] Edit Club - Remove logo (logoUrl -> null)...');
    const removeLogoRes = await fetch(`${baseUrl}/clubs/${createdClubId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        name: clubName + ' Updated',
        removeLogo: true
      })
    });
    const removeLogoData = await removeLogoRes.json();
    console.log('Remove Logo status:', removeLogoRes.status, removeLogoData);
    if (removeLogoRes.status !== 200 || removeLogoData.data?.club?.logoUrl !== null) {
      throw new Error('Remove logo failed');
    }

    // Clean up test clubs from DB
    await pool.query('DELETE FROM clubs WHERE id = ANY($1::uuid[])', [[createdClubId, noLogoClubId, cldClubId].filter(Boolean)]);
    console.log('\n[Clean Up] Test clubs deleted from database.');

    console.log('\n🎉 ALL AUTOMATED TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('\n❌ Test failure:', err.message || err);
    if (createdClubId) {
      await pool.query('DELETE FROM clubs WHERE id = $1', [createdClubId]).catch(() => {});
    }
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
