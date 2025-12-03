#!/usr/bin/env node --import tsx

import React from 'react';
import { render } from 'ink';
import { App } from './components/App';
import { clearDebugLog } from './utils/logger';

clearDebugLog();

render(<App />);
