import { CommandLoader } from './loader';
import { CommandExecutor } from './executor';

async function testCommandSystem() {
	console.log('Testing Command System\n');

	const loader = new CommandLoader();
	const executor = new CommandExecutor();

	try {
		console.log('1. Loading commands...');
		const commands = await loader.loadCommands();
		console.log(`   ✓ Loaded ${commands.length} command(s)`);

		if (commands.length === 0) {
			console.log('   No commands to test');
			return;
		}

		console.log('\n2. Available commands:');
		for (const cmd of commands) {
			console.log(`   - ${cmd.id}: ${cmd.name} (${cmd.type})`);
			console.log(`     ${cmd.description}`);
		}

		console.log('\n3. Testing shell command execution...');
		const testCmd = commands.find((c) => c.type === 'shell');
		if (!testCmd) {
			console.log('   No shell commands to test');
			return;
		}

		console.log(`   Executing: ${testCmd.id}`);
		const result = await executor.execute(testCmd);

		console.log(`   Success: ${result.success}`);
		console.log(`   Message: ${result.message}`);
		if (result.error) {
			console.log(`   Error: ${result.error}`);
		}

		console.log('\n✓ Command system test completed');
	} catch (error) {
		console.error('\n✗ Test failed:');
		console.error(error);
		process.exit(1);
	}
}

testCommandSystem();
