#!/usr/bin/env python3
"""
Fix the seed threads replacement. The previous script's closing marker
didn't match because the last thread in the array has no trailing comma
(mutationCount: 0\n    }\n  ]); rather than mutationCount: 0\n    },\n  ]);).
This script uses line-based slicing to be exact.
"""
PATH = 'src/App.tsx'

with open(PATH, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find the bbsThreads useState opening line
start_idx = None
for i, line in enumerate(lines):
    if 'const [bbsThreads, setBbsThreads] = useState<BBSThread[]>([' in line:
        start_idx = i
        break

if start_idx is None:
    print("ERROR: bbsThreads useState opening not found")
    exit(1)

# Find the closing ']);' after the start
end_idx = None
for i in range(start_idx + 1, len(lines)):
    if lines[i].rstrip() == '  ]);':
        end_idx = i
        break

if end_idx is None:
    print("ERROR: bbsThreads useState closing not found")
    exit(1)

print(f"  Found opening at line {start_idx + 1}")
print(f"  Found closing at line {end_idx + 1}")
print(f"  Span: {end_idx - start_idx + 1} lines")

# Replace the entire span with a single line
new_lines = [
    f"  const [bbsThreads, setBbsThreads] = useState<BBSThread[]>(() => getSeedThreads(playerGroupName));\n"
]

# Keep everything before the opening, and everything from end_idx+1 onward
result = lines[:start_idx] + new_lines + lines[end_idx + 1:]

with open(PATH, 'w', encoding='utf-8') as f:
    f.writelines(result)

print(f"  Wrote {PATH}")
print(f"  Removed {end_idx - start_idx} lines, added 1")
