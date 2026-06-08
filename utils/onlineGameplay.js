import { getSyncSupabaseClient, isAimboticSupabaseConfigured, isSupabaseConfigured } from './supabase';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const ROOM_CODE_LENGTH = 6;

function createRoomCode() {
  let code = '';
  for (let index = 0; index < ROOM_CODE_LENGTH; index += 1) {
    code += ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return code;
}

function requireOnlineClient() {
  if (!isAimboticSupabaseConfigured() && !isSupabaseConfigured()) {
    throw new Error('Online gameplay requires a configured Supabase connection.');
  }

  const supabase = getSyncSupabaseClient();
  if (!supabase) {
    throw new Error('Online gameplay could not create a Supabase client.');
  }

  return supabase;
}

async function insertRoomEvent(supabase, roomId, playerId, eventType, payload = {}) {
  const { error } = await supabase.from('sudoku_online_events').insert({
    room_id: roomId,
    player_id: playerId,
    event_type: eventType,
    payload,
  });

  if (error) {
    throw error;
  }
}

async function getNextSeatNumber(supabase, roomId, maxPlayers) {
  const { data, error } = await supabase
    .from('sudoku_online_room_players')
    .select('seat_number')
    .eq('room_id', roomId)
    .order('seat_number', { ascending: true });

  if (error) {
    throw error;
  }

  const takenSeats = new Set((data ?? []).map((player) => player.seat_number));
  for (let seat = 1; seat <= maxPlayers; seat += 1) {
    if (!takenSeats.has(seat)) {
      return seat;
    }
  }

  return null;
}

async function getExistingRoomPlayer(supabase, roomId, playerId) {
  const { data, error } = await supabase
    .from('sudoku_online_room_players')
    .select('*')
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function joinRoom(supabase, room, { playerId, displayName = 'Player' }) {
  const existingPlayer = await getExistingRoomPlayer(supabase, room.id, playerId);
  const seatNumber = existingPlayer?.seat_number ?? await getNextSeatNumber(supabase, room.id, room.max_players);
  if (!seatNumber) {
    throw new Error('This online room is full.');
  }

  const { data: roomPlayer, error: playerError } = await supabase
    .from('sudoku_online_room_players')
    .upsert(
      {
        room_id: room.id,
        player_id: playerId,
        display_name: displayName,
        seat_number: seatNumber,
        status: room.status === 'playing' ? 'playing' : 'joined',
        last_seen_at: new Date().toISOString(),
      },
      { onConflict: 'room_id,player_id' }
    )
    .select('*')
    .single();

  if (playerError) {
    throw playerError;
  }

  await insertRoomEvent(supabase, room.id, playerId, 'player_joined', {
    displayName,
    seatNumber,
  });

  return { room, roomPlayer };
}

async function findOpenRankedRoom(supabase, { playerId, rankName, difficulty }) {
  const { data: rooms, error } = await supabase
    .from('sudoku_online_rooms')
    .select('*')
    .contains('board_seed', {
      queue: 'ranked',
      rank: rankName,
      difficulty,
    })
    .in('status', ['waiting', 'ready', 'playing'])
    .neq('host_player_id', playerId)
    .gt('expires_at', new Date().toISOString())
    .order('last_activity_at', { ascending: true })
    .limit(8);

  if (error) {
    throw error;
  }

  for (const room of rooms ?? []) {
    const { data: players, error: playersError } = await supabase
      .from('sudoku_online_room_players')
      .select('player_id,display_name,status')
      .eq('room_id', room.id)
      .neq('status', 'left')
      .neq('status', 'disconnected');

    if (playersError) {
      throw playersError;
    }

    if ((players ?? []).length < room.max_players) {
      return {
        room,
        players: players ?? [],
      };
    }
  }

  return null;
}

export function isOnlineGameplayConfigured() {
  return isAimboticSupabaseConfigured() || isSupabaseConfigured();
}

export async function createOnlineRoom({
  playerId,
  displayName = 'Player',
  puzzleId = null,
  boardSeed = {},
  maxPlayers = 2,
}) {
  const supabase = requireOnlineClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const roomCode = createRoomCode();
    const { data: room, error: roomError } = await supabase
      .from('sudoku_online_rooms')
      .insert({
        room_code: roomCode,
        host_player_id: playerId,
        puzzle_id: puzzleId,
        board_seed: boardSeed,
        max_players: maxPlayers,
      })
      .select('*')
      .single();

    if (roomError) {
      if (roomError.code === '23505') {
        continue;
      }
      throw roomError;
    }

    const { data: roomPlayer, error: playerError } = await supabase
      .from('sudoku_online_room_players')
      .insert({
        room_id: room.id,
        player_id: playerId,
        display_name: displayName,
        seat_number: 1,
        status: 'joined',
      })
      .select('*')
      .single();

    if (playerError) {
      throw playerError;
    }

    await insertRoomEvent(supabase, room.id, playerId, 'room_created', {
      roomCode,
      maxPlayers,
      puzzleId,
    });

    return { room, roomPlayer };
  }

  throw new Error('Could not generate a unique online room code.');
}

export async function joinOnlineRoom({ roomCode, playerId, displayName = 'Player' }) {
  const supabase = requireOnlineClient();
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  const { data: room, error: roomError } = await supabase
    .from('sudoku_online_rooms')
    .select('*')
    .eq('room_code', normalizedRoomCode)
    .in('status', ['waiting', 'ready', 'playing'])
    .gt('expires_at', new Date().toISOString())
    .single();

  if (roomError) {
    throw roomError;
  }

  return joinRoom(supabase, room, { playerId, displayName });
}

export async function findOrCreateRankedRoom({
  playerId,
  displayName = 'Player',
  rankName,
  puzzleId,
  difficulty,
  boardSeed = {},
  maxPlayers = 2,
}) {
  const supabase = requireOnlineClient();
  const matchedRoom = await findOpenRankedRoom(supabase, {
    playerId,
    rankName,
    difficulty,
  });

  if (matchedRoom) {
    const joinedRoom = await joinRoom(supabase, matchedRoom.room, {
      playerId,
      displayName,
    });
    const opponent = matchedRoom.players.find((player) => player.player_id !== playerId);
    return {
      ...joinedRoom,
      matched: true,
      opponentName: opponent?.display_name ?? 'Opponent',
    };
  }

  const createdRoom = await createOnlineRoom({
    playerId,
    displayName,
    puzzleId,
    boardSeed: {
      ...boardSeed,
      queue: 'ranked',
      rank: rankName,
      difficulty,
    },
    maxPlayers,
  });

  return {
    ...createdRoom,
    matched: false,
    opponentName: 'Opponent',
  };
}

export async function loadOnlineRoom(roomId) {
  const supabase = requireOnlineClient();
  const { data: room, error: roomError } = await supabase
    .from('sudoku_online_rooms')
    .select('*')
    .eq('id', roomId)
    .single();

  if (roomError) {
    throw roomError;
  }

  const { data: players, error: playersError } = await supabase
    .from('sudoku_online_room_players')
    .select('*')
    .eq('room_id', roomId)
    .order('seat_number', { ascending: true });

  if (playersError) {
    throw playersError;
  }

  const { data: moves, error: movesError } = await supabase
    .from('sudoku_online_moves')
    .select('*')
    .eq('room_id', roomId)
    .order('created_at', { ascending: true });

  if (movesError) {
    throw movesError;
  }

  return { room, players: players ?? [], moves: moves ?? [] };
}

export async function setOnlinePlayerReady({ roomId, playerId, ready }) {
  const supabase = requireOnlineClient();
  const status = ready ? 'ready' : 'joined';
  const timestamp = new Date().toISOString();

  const { data: roomPlayer, error } = await supabase
    .from('sudoku_online_room_players')
    .update({ status, last_seen_at: timestamp })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await insertRoomEvent(supabase, roomId, playerId, ready ? 'player_ready' : 'player_unready');
  return roomPlayer;
}

export async function startOnlineRoom({ roomId, playerId }) {
  const supabase = requireOnlineClient();
  const timestamp = new Date().toISOString();

  const { data: room, error } = await supabase
    .from('sudoku_online_rooms')
    .update({
      status: 'playing',
      started_at: timestamp,
      current_turn_player_id: playerId,
      last_activity_at: timestamp,
    })
    .eq('id', roomId)
    .eq('host_player_id', playerId)
    .in('status', ['waiting', 'ready'])
    .select('*')
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!room) {
    return null;
  }

  await supabase
    .from('sudoku_online_room_players')
    .update({ status: 'playing', last_seen_at: timestamp })
    .eq('room_id', roomId)
    .in('status', ['joined', 'ready']);

  await insertRoomEvent(supabase, roomId, playerId, 'room_started');
  return room;
}

export async function recordOnlineMove({
  roomId,
  playerId,
  rowIndex,
  colIndex,
  value,
  isCorrect = null,
  elapsedMs = null,
  clientMoveId = null,
  score = null,
  completedCells = null,
  mistakes = null,
}) {
  const supabase = requireOnlineClient();
  const timestamp = new Date().toISOString();

  const { data: move, error: moveError } = await supabase
    .from('sudoku_online_moves')
    .insert({
      room_id: roomId,
      player_id: playerId,
      row_index: rowIndex,
      col_index: colIndex,
      value,
      is_correct: isCorrect,
      elapsed_ms: elapsedMs,
      client_move_id: clientMoveId,
    })
    .select('*')
    .single();

  if (moveError) {
    throw moveError;
  }

  await supabase
    .from('sudoku_online_rooms')
    .update({ last_activity_at: timestamp })
    .eq('id', roomId);

  const playerUpdate = { last_seen_at: timestamp };
  if (Number.isFinite(score)) {
    playerUpdate.score = score;
  }
  if (Number.isFinite(completedCells)) {
    playerUpdate.completed_cells = completedCells;
  }
  if (Number.isFinite(mistakes)) {
    playerUpdate.mistakes = mistakes;
  }

  await supabase
    .from('sudoku_online_room_players')
    .update(playerUpdate)
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  return move;
}

export async function completeOnlineRoom({ roomId, playerId, score, completedCells, mistakes }) {
  const supabase = requireOnlineClient();
  const timestamp = new Date().toISOString();

  const { error: playerError } = await supabase
    .from('sudoku_online_room_players')
    .update({
      status: 'completed',
      score,
      completed_cells: completedCells,
      mistakes,
      completed_at: timestamp,
      last_seen_at: timestamp,
    })
    .eq('room_id', roomId)
    .eq('player_id', playerId);

  if (playerError) {
    throw playerError;
  }

  const { data: room, error: roomError } = await supabase
    .from('sudoku_online_rooms')
    .update({
      status: 'completed',
      winner_player_id: playerId,
      finished_at: timestamp,
      last_activity_at: timestamp,
    })
    .eq('id', roomId)
    .neq('status', 'completed')
    .select('*')
    .maybeSingle();

  if (roomError) {
    throw roomError;
  }

  await insertRoomEvent(supabase, roomId, playerId, 'room_completed', {
    score,
    completedCells,
    mistakes,
  });

  return room;
}

export async function failOnlineAttempt({ roomId, playerId, score, completedCells, mistakes }) {
  const supabase = requireOnlineClient();
  const timestamp = new Date().toISOString();

  const { data: roomPlayer, error } = await supabase
    .from('sudoku_online_room_players')
    .update({
      status: 'completed',
      score,
      completed_cells: completedCells,
      mistakes,
      completed_at: timestamp,
      last_seen_at: timestamp,
    })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  const { data: opponents, error: opponentsError } = await supabase
    .from('sudoku_online_room_players')
    .select('player_id,status')
    .eq('room_id', roomId)
    .neq('player_id', playerId)
    .not('status', 'in', '("left","disconnected")')
    .order('seat_number', { ascending: true })
    .limit(1);

  if (opponentsError) {
    throw opponentsError;
  }

  const winnerPlayerId = opponents?.[0]?.player_id ?? null;
  if (winnerPlayerId) {
    const { error: roomError } = await supabase
      .from('sudoku_online_rooms')
      .update({
        status: 'completed',
        winner_player_id: winnerPlayerId,
        finished_at: timestamp,
        last_activity_at: timestamp,
      })
      .eq('id', roomId)
      .neq('status', 'completed');

    if (roomError) {
      throw roomError;
    }
  } else {
    const { error: roomError } = await supabase
      .from('sudoku_online_rooms')
      .update({ last_activity_at: timestamp })
      .eq('id', roomId);

    if (roomError) {
      throw roomError;
    }
  }

  await insertRoomEvent(supabase, roomId, playerId, 'player_failed', {
    score,
    completedCells,
    mistakes,
    winnerPlayerId,
  });

  return roomPlayer;
}

export async function leaveOnlineRoom({ roomId, playerId }) {
  const supabase = requireOnlineClient();
  const timestamp = new Date().toISOString();

  const { data: roomPlayer, error } = await supabase
    .from('sudoku_online_room_players')
    .update({ status: 'left', last_seen_at: timestamp })
    .eq('room_id', roomId)
    .eq('player_id', playerId)
    .select('*')
    .single();

  if (error) {
    throw error;
  }

  await insertRoomEvent(supabase, roomId, playerId, 'player_left');
  return roomPlayer;
}

export function subscribeToOnlineRoom(roomId, handlers = {}) {
  const supabase = requireOnlineClient();
  const channel = supabase.channel(`sudoku-online-room:${roomId}`);

  channel
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'sudoku_online_rooms', filter: `id=eq.${roomId}` },
      (payload) => handlers.onRoomChange?.(payload)
    )
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'sudoku_online_room_players',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handlers.onPlayersChange?.(payload)
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sudoku_online_moves',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handlers.onMove?.(payload)
    )
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'sudoku_online_events',
        filter: `room_id=eq.${roomId}`,
      },
      (payload) => handlers.onEvent?.(payload)
    )
    .subscribe((status) => handlers.onStatusChange?.(status));

  return () => {
    supabase.removeChannel(channel);
  };
}
