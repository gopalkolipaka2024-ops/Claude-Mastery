#!/usr/bin/env python3
"""Filter the Open Food Facts CSV export (piped in, gzipped) to US/CA/UK/IE products that have photos.

Run:  curl -sS https://openfoodfacts-ds.s3.eu-west-3.amazonaws.com/en.openfoodfacts.org.products.csv.gz | python3 scripts/extract_off_candidates.py
"""
import sys, gzip, io
H=None
keep=['code','product_name','quantity','brands','categories_tags','countries_tags','unique_scans_n','image_url','completeness','main_category']
out=open('candidates.tsv','w')
n=k=0
f=io.TextIOWrapper(gzip.GzipFile(fileobj=sys.stdin.buffer),encoding='utf-8',errors='replace')
for line in f:
    if H is None:
        H=line.rstrip('\n').split('\t'); idx=[H.index(c) for c in keep]; ci=H.index('countries_tags'); ii=H.index('image_url'); continue
    n+=1
    if 'united-states' not in line and 'ireland' not in line and 'united-kingdom' not in line and 'canada' not in line: continue
    r=line.rstrip('\n').split('\t')
    if len(r)<len(H): continue
    c=r[ci]
    if not ('united-states' in c or 'ireland' in c or 'united-kingdom' in c or 'canada' in c): continue
    if not r[ii]: continue
    out.write('\t'.join(r[i].replace('\t',' ') for i in idx)+'\n'); k+=1
    if k%100000==0: print(n,k,flush=True)
print('done',n,k,flush=True)
