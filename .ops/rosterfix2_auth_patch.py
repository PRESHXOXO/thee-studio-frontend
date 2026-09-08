import sys

path = sys.argv[1]
with open(path, 'r', encoding='utf-8') as fh:
    source = fh.read()

old = 'if(G)try{if(!(r!=null&&r.__e2e)&&!(r!=null&&r.__api)){try{await JT(r,G.id)}'
new = 'if(G)try{if(r!=null&&r.__api){await tsFastifyHydrateCreatorRoster()}else if(!(r!=null&&r.__e2e)){try{await JT(r,G.id)}'

count = source.count(old)
if count != 1:
    raise SystemExit(f'Expected exactly one Fastify auth branch target, found {count}')

source = source.replace(old, new, 1)

if source.count('await tsFastifyHydrateCreatorRoster()') < 2:
    raise SystemExit('Expected auth hydration call plus existing bootstrap call after patch')

with open(path, 'w', encoding='utf-8') as fh:
    fh.write(source)
