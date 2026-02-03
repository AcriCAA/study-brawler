<div class="space-y-4">
    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Username</span>
            <button
                type="button"
                onclick="navigator.clipboard.writeText('{{ $student->username }}')"
                class="text-primary-500 hover:text-primary-700 text-sm"
            >
                Copy
            </button>
        </div>
        <code class="text-lg font-mono text-gray-900 dark:text-gray-100">{{ $student->username }}</code>
    </div>

    <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <div class="flex items-center justify-between mb-2">
            <span class="text-sm font-medium text-gray-500 dark:text-gray-400">Password</span>
            <button
                type="button"
                onclick="navigator.clipboard.writeText('{{ $student->plain_password }}')"
                class="text-primary-500 hover:text-primary-700 text-sm"
            >
                Copy
            </button>
        </div>
        <code class="text-lg font-mono text-gray-900 dark:text-gray-100">{{ $student->plain_password ?? '(not available)' }}</code>
    </div>

    <div class="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
        <p class="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> Share these credentials with the student. They will use these to log in to the game at <code>/game</code>.
        </p>
    </div>
</div>
