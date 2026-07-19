"""
Fix the </DevModeProvider> placement. It's currently before the root
</div> instead of after. Move it to after the root </div>.
"""

from pathlib import Path

APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")

# Current broken state:
#       </footer>
#     </DevModeProvider>
#   );
# }
#
# Target state:
#       </footer>
#     </div>              <-- closes root min-h-screen div
#   </DevModeProvider>
#   );
# }

OLD = "      </footer>\n    </DevModeProvider>\n  );\n}"
NEW = "      </footer>\n    </div>\n    </DevModeProvider>\n  );\n}"

if OLD not in src:
    # The file might have a slightly different structure. Try a more
    # lenient match: find the </DevModeProvider> just before );
    print("Exact pattern not found. Trying lenient match...")
    import re
    # Find </DevModeProvider> immediately before );
    match = re.search(r"\s*</DevModeProvider>\s*\n  \);", src)
    if not match:
        raise SystemExit("Could not find </DevModeProvider> before );")
    # Replace with </div>\n    </DevModeProvider>
    src = src[:match.start()] + "\n    </div>\n    </DevModeProvider>\n  );" + src[match.end():]
    print("OK: moved </DevModeProvider> after root </div> (lenient match)")
else:
    src = src.replace(OLD, NEW, 1)
    print("OK: moved </DevModeProvider> after root </div>")

APP_TS.write_text(src, encoding="utf-8")
