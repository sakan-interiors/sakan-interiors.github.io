"""Writes portfolio/artifact_test/index.html: the single-page preview wrapped in the same
<head> the claude.ai host adds (saved in portfolio/host_head.html), with paths pointing at ../artifact/."""
import re
import os
SD = os.environ.get('PF', '/tmp/claude-0/-home-user/08c2b762-ba25-5ee8-a6d2-91f36c2ae41e/scratchpad/portfolio')
body = open(SD + '/artifact/index.html').read()
body = re.sub(r'(?<=["\s,(])(img|css|js)/', r'../artifact/\1/', body)
open(SD + '/artifact_test/index.html', 'w').write(open(SD + '/host_head.html').read() + '\n' + body + '\n</body></html>')
print('harness written')
