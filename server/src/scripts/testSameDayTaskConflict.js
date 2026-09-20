require('dotenv').config();
const { pool } = require('../config/database');
const jwt = require('jsonwebtoken');

async function runTests() {
  console.log('--- Starting Automated Same-Day Task Assignment Verification ---');

  const superAdminToken = jwt.sign(
    {
      id: '00000000-0000-0000-0000-000000000001',
      email: 'superadmin@clubops.ai',
      role: 'SUPER_ADMIN'
    },
    process.env.JWT_SECRET || 'clubops_jwt_secret_secure_key_2026_super_hackathon',
    { expiresIn: '1h' }
  );

  const baseUrl = 'http://localhost:5000/api';

  let testClubId = null;
  let testEventId = null;
  let volunteer1Id = null;
  let volunteer2Id = null;
  const createdTaskIds = [];

  try {
    // Setup test club, event, and volunteers in database
    console.log('\n[Setup] Creating test club, event, and volunteers...');
    const clubRes = await pool.query(
      `INSERT INTO clubs (name, description, is_active)
       VALUES ($1, 'Test Club for Same-Day Tasks', TRUE)
       RETURNING id`,
      [`Test Club SameDay ${Date.now()}`]
    );
    testClubId = clubRes.rows[0].id;

    const eventRes = await pool.query(
      `INSERT INTO events (club_id, name, description, event_date)
       VALUES ($1, 'Test Event SameDay', 'Test Event Description', '2026-09-28T09:00:00.000Z')
       RETURNING id`,
      [testClubId]
    );
    testEventId = eventRes.rows[0].id;

    const v1Res = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, club_id, is_active)
       VALUES ('Rahul Sharma', $1, 'hashedpass', 'VOLUNTEER', $2, TRUE)
       RETURNING id`,
      [`rahul_${Date.now()}@example.com`, testClubId]
    );
    volunteer1Id = v1Res.rows[0].id;

    const v2Res = await pool.query(
      `INSERT INTO users (name, email, password_hash, role, club_id, is_active)
       VALUES ('Priya Patel', $1, 'hashedpass', 'VOLUNTEER', $2, TRUE)
       RETURNING id`,
      [`priya_${Date.now()}@example.com`, testClubId]
    );
    volunteer2Id = v2Res.rows[0].id;

    // Assign volunteers to event
    await pool.query(
      `INSERT INTO volunteers (event_id, user_id, responsibility)
       VALUES ($1, $2, 'Logistics'), ($1, $3, 'Registration')`,
      [testEventId, volunteer1Id, volunteer2Id]
    );
    console.log(`[Setup Complete] Event: ${testEventId}, Rahul: ${volunteer1Id}, Priya: ${volunteer2Id}`);

    // --- TEST 1: First task for Rahul on 28 Sep (No conflict) ---
    console.log('\n[Case 1] Assigning first task to Rahul on 28 Sep (No existing task)...');
    const task1Res = await fetch(`${baseUrl}/events/${testEventId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Stage Setup',
        assignedTo: volunteer1Id,
        deadline: '2026-09-28T10:00:00.000Z'
      })
    });
    const task1Data = await task1Res.json();
    console.log('Case 1 Status:', task1Res.status, task1Data.message);
    if (task1Res.status !== 201) throw new Error('Expected 201 Created for first task');
    createdTaskIds.push(task1Data.data.task.id);

    // --- TEST 2: Second task for Rahul on 28 Sep WITHOUT confirmation ---
    console.log('\n[Case 2] Assigning second task to Rahul on 28 Sep (WITHOUT confirmation)...');
    const task2Res = await fetch(`${baseUrl}/events/${testEventId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Speaker Coordination',
        assignedTo: volunteer1Id,
        deadline: '2026-09-28T17:00:00.000Z'
      })
    });
    const task2Data = await task2Res.json();
    console.log('Case 2 Status:', task2Res.status, task2Data);
    if (task2Res.status !== 409) throw new Error(`Expected 409 Conflict, got ${task2Res.status}`);
    if (!task2Data.requiresConfirmation || !task2Data.message.includes('already has a task assigned on this date')) {
      throw new Error('Expected requiresConfirmation and warning message');
    }
    if (!task2Data.data?.conflictingTasks || task2Data.data.conflictingTasks.length !== 1) {
      throw new Error('Expected 1 conflicting task in response');
    }

    // --- TEST 3: User Confirms (Assign Anyway with confirmSameDayAssignment: true) ---
    console.log('\n[Case 4 (Confirm)] Assigning second task to Rahul with confirmSameDayAssignment: true...');
    const task2ConfirmRes = await fetch(`${baseUrl}/events/${testEventId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Speaker Coordination',
        assignedTo: volunteer1Id,
        deadline: '2026-09-28T17:00:00.000Z',
        confirmSameDayAssignment: true
      })
    });
    const task2ConfirmData = await task2ConfirmRes.json();
    console.log('Case 4 Confirm Status:', task2ConfirmRes.status, task2ConfirmData.message);
    if (task2ConfirmRes.status !== 201) throw new Error('Expected 201 Created when confirmed');
    createdTaskIds.push(task2ConfirmData.data.task.id);

    // Verify both tasks now exist in DB for Rahul on 28 Sep
    const rahulTasksDb = await pool.query(
      `SELECT id, description, deadline FROM tasks WHERE event_id = $1 AND assigned_to = $2`,
      [testEventId, volunteer1Id]
    );
    console.log(`Rahul now has ${rahulTasksDb.rows.length} tasks in DB (both allowed!).`);
    if (rahulTasksDb.rows.length !== 2) throw new Error('Expected 2 tasks in database for Rahul');

    // --- TEST 4: Same volunteer, DIFFERENT date (29 Sep) ---
    console.log('\n[Case 5] Assigning task to Rahul on different date (29 Sep)...');
    const taskDiffDateRes = await fetch(`${baseUrl}/events/${testEventId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Post-Event Cleanup',
        assignedTo: volunteer1Id,
        deadline: '2026-09-29T10:00:00.000Z'
      })
    });
    const taskDiffDateData = await taskDiffDateRes.json();
    console.log('Case 5 Status:', taskDiffDateRes.status, taskDiffDateData.message);
    if (taskDiffDateRes.status !== 201) throw new Error('Expected 201 Created directly for different date');
    createdTaskIds.push(taskDiffDateData.data.task.id);

    // --- TEST 5: Different volunteer (Priya) on 28 Sep ---
    console.log('\n[Case 6] Assigning task to Priya on 28 Sep (different volunteer)...');
    const taskPriyaRes = await fetch(`${baseUrl}/events/${testEventId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Registration Desk',
        assignedTo: volunteer2Id,
        deadline: '2026-09-28T09:00:00.000Z'
      })
    });
    const taskPriyaData = await taskPriyaRes.json();
    console.log('Case 6 Status:', taskPriyaRes.status, taskPriyaData.message);
    if (taskPriyaRes.status !== 201) throw new Error('Expected 201 Created directly for different volunteer');
    createdTaskIds.push(taskPriyaData.data.task.id);

    // --- TEST 6: Unassigned task on 28 Sep ---
    console.log('\n[Case 9 (Unassigned)] Assigning unassigned task on 28 Sep...');
    const unassignedRes = await fetch(`${baseUrl}/events/${testEventId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'General Signage Placement',
        assignedTo: null,
        deadline: '2026-09-28T08:00:00.000Z'
      })
    });
    const unassignedData = await unassignedRes.json();
    console.log('Unassigned Status:', unassignedRes.status, unassignedData.message);
    if (unassignedRes.status !== 201) throw new Error('Expected 201 Created for unassigned task');
    createdTaskIds.push(unassignedData.data.task.id);

    // --- TEST 7: Multiple existing tasks check (Rahul on 28 Sep now has 2 tasks) ---
    console.log('\n[Case 7 (Multiple Existing)] Attempting 3rd task for Rahul on 28 Sep (unconfirmed)...');
    const task3Res = await fetch(`${baseUrl}/events/${testEventId}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Audio Check',
        assignedTo: volunteer1Id,
        deadline: '2026-09-28T14:00:00.000Z'
      })
    });
    const task3Data = await task3Res.json();
    console.log('Multiple Existing Status:', task3Res.status, task3Data.data?.conflictingTasks?.length, 'conflicts');
    if (task3Res.status !== 409 || task3Data.data?.conflictingTasks?.length !== 2) {
      throw new Error('Expected 409 with 2 conflicting tasks');
    }

    // --- TEST 8: Editing an existing task without changing date/assignee (Self-conflict check) ---
    console.log('\n[Case 8 (Edit Self)] Updating task description without changing date/volunteer...');
    const editSelfRes = await fetch(`${baseUrl}/events/${testEventId}/tasks/${createdTaskIds[0]}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Stage Setup (Updated Notes)',
        assignedTo: volunteer1Id,
        deadline: '2026-09-28T10:00:00.000Z'
      })
    });
    const editSelfData = await editSelfRes.json();
    console.log('Edit Self Status:', editSelfRes.status, editSelfData.message);
    if (editSelfRes.status !== 200) throw new Error('Expected 200 OK without self-conflict');

    // --- TEST 9: Editing a task to move it to a date where volunteer already has a task (unconfirmed) ---
    console.log('\n[Case 8b (Edit Conflict)] Moving Priya task to Rahul on 28 Sep (unconfirmed)...');
    const editConflictRes = await fetch(`${baseUrl}/events/${testEventId}/tasks/${taskPriyaData.data.task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Registration Desk (Reassigned to Rahul)',
        assignedTo: volunteer1Id,
        deadline: '2026-09-28T11:00:00.000Z'
      })
    });
    const editConflictData = await editConflictRes.json();
    console.log('Edit Conflict Status:', editConflictRes.status, editConflictData.message);
    if (editConflictRes.status !== 409 || !editConflictData.requiresConfirmation) {
      throw new Error('Expected 409 Conflict when editing to a date with existing tasks');
    }

    // --- TEST 10: Editing with confirmSameDayAssignment: true ---
    console.log('\n[Case 8c (Edit Confirm)] Moving task with confirmSameDayAssignment: true...');
    const editConfirmRes = await fetch(`${baseUrl}/events/${testEventId}/tasks/${taskPriyaData.data.task.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${superAdminToken}`
      },
      body: JSON.stringify({
        description: 'Registration Desk (Reassigned to Rahul)',
        assignedTo: volunteer1Id,
        deadline: '2026-09-28T11:00:00.000Z',
        confirmSameDayAssignment: true
      })
    });
    const editConfirmData = await editConfirmRes.json();
    console.log('Edit Confirm Status:', editConfirmRes.status, editConfirmData.message);
    if (editConfirmRes.status !== 200) throw new Error('Expected 200 OK when editing with confirmation');

    console.log('\n🎉 ALL SAME-DAY ASSIGNMENT TEST CASES PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('\n❌ Test failure:', err.message || err);
    process.exit(1);
  } finally {
    // Cleanup test data
    console.log('\n[Cleanup] Removing test club and associated data...');
    if (testClubId) {
      await pool.query('DELETE FROM clubs WHERE id = $1', [testClubId]);
    }
    await pool.end();
  }
}

runTests();
