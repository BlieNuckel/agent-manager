#!/usr/bin/env node --import tsx

import React from 'react';
import { render } from 'ink';
import { DemoApp } from './DemoApp';

console.clear();
console.log('🎭 Agent Manager Demo Mode\n');
console.log('This is a demo mode with mock data to showcase all UI pages.');
console.log('No real agents will be spawned.\n');

render(<DemoApp />);
