'use client';
import Link from 'next/link';
import React, { useState, useRef, useCallback, useEffect } from 'react';

const InteractiveClock = () => {
  const [time, setTime] = useState({ hours: 3, minutes: 20 });
  const [isDragging, setIsDragging] = useState({ hour: false, minute: false });
  const [isClient, setIsClient] = useState(false);
  const clockRef = useRef(null);

  const clockSize = 300;
  const center = clockSize / 2;
  const clockRadius = center - 20;

  // Ensure component only renders on client side
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Convert time to angles (0° = 12 o'clock, clockwise)
  const minuteAngle = time.minutes * 6 - 90; // 6° per minute
  const hourAngle = (time.hours % 12) * 30 + time.minutes * 0.5 - 90; // 30° per hour + minute adjustment

  // Convert angle to clock position with fixed precision
  const getHandPosition = (angle, length) => {
    const radians = (angle * Math.PI) / 180;
    return {
      x: Math.round((center + Math.cos(radians) * length) * 1000) / 1000,
      y: Math.round((center + Math.sin(radians) * length) * 1000) / 1000,
    };
  };

  // Convert mouse position to angle
  const getAngleFromPosition = (clientX, clientY) => {
    if (!clockRef.current) return 0;

    const rect = clockRef.current.getBoundingClientRect();
    const x = clientX - rect.left - center;
    const y = clientY - rect.top - center;

    let angle = Math.atan2(y, x) * (180 / Math.PI) + 90;
    if (angle < 0) angle += 360;
    return angle;
  };

  // Handle mouse/touch events
  const handleStart = useCallback(
    (e, hand) => {
      e.preventDefault();
      setIsDragging({ ...isDragging, [hand]: true });
    },
    [isDragging]
  );

  const handleMove = useCallback(
    (e) => {
      if (!isDragging.hour && !isDragging.minute) return;

      e.preventDefault();
      const clientX = e.type.includes('touch')
        ? e.touches[0].clientX
        : e.clientX;
      const clientY = e.type.includes('touch')
        ? e.touches[0].clientY
        : e.clientY;

      const angle = getAngleFromPosition(clientX, clientY);

      if (isDragging.minute) {
        const minutes = Math.round(angle / 6) % 60;
        setTime((prev) => ({ ...prev, minutes }));
      }

      if (isDragging.hour) {
        const hours = Math.round(angle / 30) % 12;
        setTime((prev) => ({ ...prev, hours: hours === 0 ? 12 : hours }));
      }
    },
    [isDragging]
  );

  const handleEnd = useCallback(() => {
    setIsDragging({ hour: false, minute: false });
  }, []);

  // Add event listeners
  useEffect(() => {
    if (isDragging.hour || isDragging.minute) {
      document.addEventListener('mousemove', handleMove);
      document.addEventListener('mouseup', handleEnd);
      document.addEventListener('touchmove', handleMove, { passive: false });
      document.addEventListener('touchend', handleEnd);

      return () => {
        document.removeEventListener('mousemove', handleMove);
        document.removeEventListener('mouseup', handleEnd);
        document.removeEventListener('touchmove', handleMove);
        document.removeEventListener('touchend', handleEnd);
      };
    }
  }, [isDragging, handleMove, handleEnd]);

  // Don't render until client-side hydration is complete
  if (!isClient) {
    return (
      <div className='flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8'>
        <div className='bg-white rounded-xl shadow-2xl p-8'>
          <h1 className='text-2xl font-bold text-gray-800 text-center mb-6'>
            Interactive Clock
          </h1>
          <div className='w-[300px] h-[300px] flex items-center justify-center'>
            <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500'></div>
          </div>
        </div>
      </div>
    );
  }

  const hourPos = getHandPosition(hourAngle, clockRadius * 0.5);
  const minutePos = getHandPosition(minuteAngle, clockRadius * 0.75);

  // Generate hour markers
  const hourMarkers = Array.from({ length: 12 }, (_, i) => {
    const angle = i * 30 - 90;
    const outerPos = getHandPosition(angle, clockRadius - 10);
    const innerPos = getHandPosition(angle, clockRadius - 25);
    const numberPos = getHandPosition(angle, clockRadius - 35);

    return (
      <g key={i}>
        <line
          x1={outerPos.x}
          y1={outerPos.y}
          x2={innerPos.x}
          y2={innerPos.y}
          stroke='#333'
          strokeWidth='3'
        />
        <text
          x={numberPos.x}
          y={numberPos.y}
          textAnchor='middle'
          dominantBaseline='central'
          className='text-lg font-bold fill-gray-800'
        >
          {i === 0 ? 12 : i}
        </text>
      </g>
    );
  });

  // Generate minute markers
  const minuteMarkers = Array.from({ length: 60 }, (_, i) => {
    if (i % 5 === 0) return null; // Skip hour positions
    const angle = i * 6 - 90;
    const outerPos = getHandPosition(angle, clockRadius - 10);
    const innerPos = getHandPosition(angle, clockRadius - 18);

    return (
      <line
        key={i}
        x1={outerPos.x}
        y1={outerPos.y}
        x2={innerPos.x}
        y2={innerPos.y}
        stroke='#666'
        strokeWidth='1'
      />
    );
  });

  const formatTime = () => {
    const h = time.hours;
    const m = time.minutes.toString().padStart(2, '0');
    return `${h}:${m}`;
  };

  const speakTime = () => {
    const hours = time.hours;
    const minutes = time.minutes;

    // German hour names
    const germanHours = {
      1: 'eins',
      2: 'zwei',
      3: 'drei',
      4: 'vier',
      5: 'fünf',
      6: 'sechs',
      7: 'sieben',
      8: 'acht',
      9: 'neun',
      10: 'zehn',
      11: 'elf',
      12: 'zwölf',
    };

    let timeText = '';

    if (minutes === 0) {
      timeText = `${germanHours[hours]} Uhr`;
    } else if (minutes === 15) {
      timeText = `Viertel nach ${germanHours[hours]}`;
    } else if (minutes === 30) {
      timeText = `halb ${germanHours[hours === 12 ? 1 : hours + 1]}`;
    } else if (minutes === 45) {
      const nextHour = hours === 12 ? 1 : hours + 1;
      timeText = `Viertel vor ${germanHours[nextHour]}`;
    } else {
      if (minutes < 30) {
        if (minutes === 1) {
          timeText = `eine Minute nach ${germanHours[hours]}`;
        } else {
          timeText = `${minutes} Minuten nach ${germanHours[hours]}`;
        }
      } else {
        const remainingMinutes = 60 - minutes;
        const nextHour = hours === 12 ? 1 : hours + 1;
        if (remainingMinutes === 1) {
          timeText = `eine Minute vor ${germanHours[nextHour]}`;
        } else {
          timeText = `${remainingMinutes} Minuten vor ${germanHours[nextHour]}`;
        }
      }
    }

    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(`Es ist ${timeText}`);
      utterance.lang = 'de-DE';
      utterance.rate = 0.8;
      utterance.pitch = 1;
      speechSynthesis.speak(utterance);
    } else {
      alert(`Es ist ${timeText}`);
    }
  };

  return (
    <div className='flex flex-col items-center justify-center p-4 m-auto sm:h-screen'>
      <div className='bg-white rounded-xl sm:w-fit sm:shadow-2xl p-8'>
        <h1 className='text-2xl font-bold text-gray-800 text-center mb-6'>
          Uhr Stellen
        </h1>

        <div className='relative'>
          <svg
            ref={clockRef}
            width={clockSize}
            height={clockSize}
            className='drop-shadow-lg'
            style={{
              cursor:
                isDragging.hour || isDragging.minute ? 'grabbing' : 'default',
            }}
          >
            {/* Clock face */}
            <circle
              cx={center}
              cy={center}
              r={clockRadius}
              fill='white'
              stroke='#333'
              strokeWidth='4'
            />

            {/* Hour markers */}
            {hourMarkers}

            {/* Minute markers */}
            {minuteMarkers}

            {/* Hour hand */}
            <line
              x1={center}
              y1={center}
              x2={hourPos.x}
              y2={hourPos.y}
              stroke='#333'
              strokeWidth='6'
              strokeLinecap='round'
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleStart(e, 'hour')}
              onTouchStart={(e) => handleStart(e, 'hour')}
            />

            {/* Minute hand */}
            <line
              x1={center}
              y1={center}
              x2={minutePos.x}
              y2={minutePos.y}
              stroke='#BEB3FF'
              strokeWidth='4'
              strokeLinecap='round'
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleStart(e, 'minute')}
              onTouchStart={(e) => handleStart(e, 'minute')}
            />

            {/* Center dot */}
            <circle cx={center} cy={center} r='8' fill='#333' />

            {/* Hand tips for better grab area */}
            <circle
              cx={hourPos.x}
              cy={hourPos.y}
              r='12'
              fill='transparent'
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleStart(e, 'hour')}
              onTouchStart={(e) => handleStart(e, 'hour')}
            />
            <circle
              cx={minutePos.x}
              cy={minutePos.y}
              r='12'
              fill='transparent'
              style={{ cursor: 'grab' }}
              onMouseDown={(e) => handleStart(e, 'minute')}
              onTouchStart={(e) => handleStart(e, 'minute')}
            />
          </svg>
        </div>

        <div className='text-center mt-6'>
          <div className='text-3xl font-mono font-bold text-gray-800 mb-2'>
            {formatTime()}
          </div>
          <p className='text-gray-600'>Drag the clock hands to set the time</p>
          <div className='flex justify-center gap-4 mt-4 text-sm'>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-1 bg-gray-800 rounded'></div>
              <span>Hour hand</span>
            </div>
            <div className='flex items-center gap-2'>
              <div className='w-4 h-1 bg-[#BEB3FF] rounded'></div>
              <span>Minute hand</span>
            </div>
          </div>

          <button
            onClick={speakTime}
            className='mt-6 px-6 py-3 bg-[#BEB3FF] hover:opacity-80 text-white font-semibold rounded-lg transition-all flex items-center gap-2 mx-auto w-full justify-center'
          >
            Uhrzeit sprechen
          </button>
        </div>
      </div>
      <footer className='w-full bg-white absolute bottom-0 p-2'>
        <Link className='italic' href={'https://www.instagram.com/casapiara/'}>
          @casapiara
        </Link>
      </footer>
    </div>
  );
};

export default InteractiveClock;
