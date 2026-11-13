"""Refresh shared datasets. Python stdlib only; never runs as part of a live game."""
import argparse
import ast
import csv
from datetime import datetime, timezone
import gzip
import hashlib
import io
import json
from pathlib import Path
import re
import time
import tempfile
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1] / 'content'
EPA = 'https://www.fueleconomy.gov/feg/epadata/vehicles.csv'
LVIS = 'https://raw.githubusercontent.com/facebookresearch/detectron2/main/detectron2/data/datasets/lvis_v1_categories.py'
GAMES = 'SELECT ?item ?label ?genre ?platform ?date WHERE { ?item wdt:P31 wd:Q7889; rdfs:label ?label. FILTER(LANG(?label) IN ("en","mul")) OPTIONAL { ?item wdt:P136 ?genre. } OPTIONAL { ?item wdt:P400 ?platform. } OPTIONAL { ?item wdt:P577 ?date. } }'
ALIASES = 'SELECT ?item ?alias WHERE { ?item wdt:P31 wd:Q7889; skos:altLabel ?alias. FILTER(LANG(?alias)="en") }'
GENRES = 'SELECT DISTINCT ?genre ?root WHERE { VALUES ?root { wd:Q270948 wd:Q23916 wd:Q744038 wd:Q472055 wd:Q860750 wd:Q868217 wd:Q54767 wd:Q828322 wd:Q185029 } ?genre wdt:P279* ?root. }'
SPORTS_CARS = 'SELECT DISTINCT ?item ?label ?alias WHERE { ?item wdt:P279+ wd:Q274586; rdfs:label ?label. FILTER(LANG(?label) IN ("en","mul")) OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) IN ("en","mul")) } }'
CAR_COMPANIES = 'SELECT DISTINCT ?item ?label ?alias WHERE { VALUES ?root { wd:Q786820 wd:Q174126 } ?item wdt:P31 ?root; rdfs:label ?label. FILTER(LANG(?label) IN ("en","mul")) OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) IN ("en","mul")) } }'
CAR_MODELS = 'SELECT DISTINCT ?item ?label ?alias WHERE { ?item wdt:P31 wd:Q3231690; rdfs:label ?label. FILTER(LANG(?label) IN ("en","mul")) OPTIONAL { ?item skos:altLabel ?alias. FILTER(LANG(?alias) IN ("en","mul")) } }'



def key(value):
    return re.sub('[^a-z0-9]', '', value.lower())


def query_url(query):
    return 'https://query.wikidata.org/sparql?' + urllib.parse.urlencode({'query': query, 'format': 'json'})


def fetch(url, cache_name, cache):
    if cache:
        return (cache / cache_name).read_bytes()
    for attempt in range(3):
        request = urllib.request.Request(url, headers={'User-Agent': 'HotPotatoContent/1.0 (offline party-game content builder)'})
        try:
            with urllib.request.urlopen(request, timeout=60) as response:
                return response.read()
        except urllib.error.HTTPError as error:
            if attempt == 2 or error.code not in (429, 502, 503, 504):
                raise
            delay = int(error.headers.get('Retry-After', '65'))
            if delay > 120:
                raise
            time.sleep(delay)
    raise RuntimeError('Source unavailable')


def save(source_id, name, url, bodies, license_id, records, minimum):
    if len(records) < minimum or len({r['id'] for r in records}) != len(records):
        raise ValueError(f'{source_id}: incomplete or duplicate import ({len(records)})')
    snapshot = {'schemaVersion': 1, 'source': {
        'id': source_id, 'name': name, 'url': url, 'license': license_id,
        'revision': datetime.now(timezone.utc).isoformat(),
        'sha256': bodies if isinstance(bodies, str) else hashlib.sha256(b'\n'.join(bodies)).hexdigest(),
    }, 'records': sorted(records, key=lambda r: r['id'])}
    body = json.dumps(snapshot, separators=(',', ':'), ensure_ascii=False).encode()
    path = f'sources/{source_id}.json.gz'
    temporary = ROOT / (path + '.tmp')
    temporary.write_bytes(gzip.compress(body, compresslevel=9, mtime=0))
    temporary.replace(ROOT / path)
    lock_path = ROOT / 'sources.lock.json'
    lock = json.loads(lock_path.read_text())
    lock['sources'] = sorted([e for e in lock['sources'] if e['id'] != source_id] + [
        {'id': source_id, 'file': path, 'sha256': hashlib.sha256(body).hexdigest()}
    ], key=lambda e: e['id'])
    temp_lock = lock_path.with_suffix('.tmp')
    temp_lock.write_text(json.dumps(lock, indent=2) + '\n')
    temp_lock.replace(lock_path)
    print(f'{source_id}: {len(records)} records', flush=True)


def objects(cache):
    body = fetch(LVIS, 'lvis.py', cache)
    # Parse only Python's literal list. Never execute downloaded source code.
    tree = ast.parse(body)
    rows = ast.literal_eval(next(n.value for n in tree.body if isinstance(n, ast.Assign)))
    def name(value):
        return re.sub(r'\s*\([^)]*\)', '', value.replace('_', ' ')).strip()
    records = [{'id': 'lvis:' + row['synset'], 'label': name(row['name']),
                'aliases': sorted({name(s) for s in row['synonyms']}),
                'source': 'https://www.lvisdataset.org/dataset', 'facts': {}}
               for row in rows]
    save('lvis-objects', 'LVIS v1 object names and synonyms', LVIS, [body], 'CC-BY-4.0', records, 1203)


def vehicles(cache):
    body = fetch(EPA, 'epa.csv', cache)
    rows = list(csv.DictReader(io.StringIO(body.decode())))
    if len(rows) < 45000:
        raise ValueError('Incomplete EPA vehicle table')
    records = {}
    for row in rows:
        make = row['make'].strip()
        # Drivetrain variants share the model identity; performance names remain intact.
        model = re.sub(r'\s+(?:2WD|4WD|AWD|FWD|RWD)$', '', row['model'], flags=re.I).strip()
        identity = 'vehicle:' + key(make) + ':' + key(model)
        record = records.setdefault(identity, {'id': identity, 'label': make + ' ' + model,
            'aliases': set(), 'source': 'https://www.fueleconomy.gov/feg/Find.do?action=sbs&id=' + row['id'],
            'facts': {'kind': {'model'}, 'make': {make}, 'bodyClass': set(), 'drive': set(), 'fuel': set()}})
        record['aliases'].update((model, row['model'], make + ' ' + row['model']))
        facts = record['facts']
        facts['bodyClass'].add(row['VClass'])
        drive = row['drive'].lower()
        if 'all-wheel' in drive or 'or all-wheel' in drive:
            facts['drive'].add('awd')
        if '4-wheel' in drive:
            facts['drive'].add('4wd')
        if row['fuelType1'] == 'Electricity':
            facts['fuel'].add('electric')
        elif 'Hybrid' in row['atvType']:
            facts['fuel'].add('hybrid')
        else:
            facts['fuel'].add(row['fuelType1'].lower())
        make_id = 'make:' + key(make)
        records.setdefault(make_id, {'id': make_id, 'label': make, 'aliases': set(), 'facts': {'kind': {'make'}}})
    for record in records.values():
        record['aliases'] = sorted(record['aliases'])
        record['facts'] = {k: sorted(v) for k, v in record['facts'].items() if v}
    save('epa-vehicles', 'US EPA vehicle makes and models (1984 onward)', EPA, [body], 'Public-Domain', list(records.values()), 2000)
    wikidata_vehicles(cache)
    sports_body = fetch(query_url(SPORTS_CARS), 'sports-cars.json', cache)
    sports = {}
    for row in json.loads(sports_body)['results']['bindings']:
        identity = row['item']['value']
        label = row['label']['value']
        if len(label) > 100:
            continue
        record = sports.setdefault(identity, {'id': identity, 'label': label, 'aliases': [],
            'source': identity.replace('http:', 'https:'), 'facts': {'kind': ['model'], 'style': ['sports']}})
        if label != record['label']:
            record['aliases'].append(label)
        if 'alias' in row and len(row['alias']['value']) <= 100:
            record['aliases'].append(row['alias']['value'])
    for record in sports.values():
        record['aliases'] = sorted(set(record['aliases']))
    save('wikidata-sports-cars', 'Wikidata sports-car model classes', query_url(SPORTS_CARS), [sports_body], 'CC0-1.0', list(sports.values()), 100)


def wikidata_vehicles(cache):
    makes = set()
    for source_id, cache_name, query, kind, minimum in [
        ('wikidata-car-companies', 'car-companies.json', CAR_COMPANIES, 'make', 500),
        ('wikidata-car-models', 'car-models.json', CAR_MODELS, 'model', 10000),
    ]:
        body = fetch(query_url(query), cache_name, cache)
        records = {}
        for row in json.loads(body)['results']['bindings']:
            identity = row['item']['value']
            label = row['label']['value']
            if not label.strip() or len(label) > 100:
                continue
            record = records.setdefault(identity, {'id': identity, 'label': label, 'aliases': set(),
                'source': identity.replace('http:', 'https:'), 'facts': {'kind': [kind]}})
            if label != record['label']:
                record['aliases'].add(label)
            if 'alias' in row and 0 < len(row['alias']['value']) <= 100:
                record['aliases'].add(row['alias']['value'])
        if kind == 'make':
            makes = {name for record in records.values() for name in [record['label'], *record['aliases']]}
        else:
            prefixes = sorted(makes, key=len, reverse=True)
            for record in records.values():
                for make in prefixes:
                    if record['label'].lower().startswith(make.lower() + ' '):
                        record['aliases'].add(record['label'][len(make) + 1:])
                        break
        for record in records.values():
            record['aliases'] = sorted(record['aliases'])
        save(source_id, 'Wikidata global car ' + ('brands and manufacturers' if kind == 'make' else 'model classes'),
             query_url(query), [body], 'CC0-1.0', list(records.values()), minimum)


def bindings(path):
    """Stream the large SPARQL response without constructing its full row array."""
    decoder = json.JSONDecoder()
    with path.open(encoding='utf-8') as source:
        buffer = ''
        while '"bindings"' not in buffer:
            chunk = source.read(65536)
            if not chunk:
                raise ValueError('Missing SPARQL bindings')
            buffer += chunk
        marker = re.search(r'"bindings"\s*:\s*\[', buffer)
        if not marker:
            raise ValueError('Invalid SPARQL bindings')
        buffer = buffer[marker.end():]
        while True:
            buffer = buffer.lstrip(' \r\n\t,')
            if buffer.startswith(']'):
                if not re.fullmatch(r'\s*}\s*}\s*', buffer[1:] + source.read()):
                    raise ValueError('Invalid SPARQL response ending')
                return
            try:
                row, offset = decoder.raw_decode(buffer)
            except json.JSONDecodeError:
                chunk = source.read(65536)
                if not chunk:
                    raise ValueError('Truncated SPARQL response')
                buffer += chunk
                continue
            yield row
            buffer = buffer[offset:]


def games(cache):
    temporary = tempfile.TemporaryDirectory()
    if cache:
        path = cache / 'games.json'
    else:
        path = Path(temporary.name) / 'games.json'
        request = urllib.request.Request(query_url(GAMES), headers={'User-Agent': 'HotPotatoContent/1.0'})
        with urllib.request.urlopen(request, timeout=60) as response, path.open('wb') as output:
            while chunk := response.read(1024 * 1024):
                output.write(chunk)
    rows = bindings(path)
    records = {}
    for row in rows:
        label = row['label']['value']
        if not label.strip() or len(label) > 100:
            continue
        identity = row['item']['value']
        record = records.setdefault(identity, {'id': identity, 'label': label, 'aliases': set(),
            'source': identity.replace('http:', 'https:'), 'facts': {'genre': set(), 'platform': set(), 'decade': set()}})
        if label != record['label']:
            record['aliases'].add(label)
        for prop in ('genre', 'platform'):
            if prop in row:
                record['facts'][prop].add(row[prop]['value'].rsplit('/', 1)[-1])
        if 'date' in row:
            year = row['date']['value'][:4]
            if year.isdigit() and 1950 <= int(year) <= 2030:
                record['facts']['decade'].add(str(int(year) // 10 * 10))
    del rows
    aliases_body = fetch(query_url(ALIASES), 'game-aliases.json', cache)
    for row in json.loads(aliases_body)['results']['bindings']:
        record = records.get(row['item']['value'])
        if record and 0 < len(row['alias']['value']) <= 100:
            record['aliases'].add(row['alias']['value'])
    tree_body = fetch(query_url(GENRES), 'game-genre-tree.json', cache)
    ancestors = {}
    for row in json.loads(tree_body)['results']['bindings']:
        ancestors.setdefault(row['genre']['value'].rsplit('/', 1)[-1], set()).add(row['root']['value'].rsplit('/', 1)[-1])
    for record in records.values():
        genres = record['facts']['genre']
        record['facts']['genre'] = genres | set().union(*(ancestors.get(g, set()) for g in genres))
        record['aliases'] = sorted(record['aliases'])
        record['facts'] = {k: sorted(v) for k, v in record['facts'].items() if v}
    checksum = hashlib.sha256()
    with path.open('rb') as source:
        while chunk := source.read(1024 * 1024):
            checksum.update(chunk)
    checksum.update(b'\n' + aliases_body + b'\n' + tree_body)
    save('wikidata-video-games', 'Wikidata video games with genres, platforms and release decades', query_url(GAMES),
         checksum.hexdigest(), 'CC0-1.0', list(records.values()), 100000)


    temporary.cleanup()


def pokemon(cache):
    base = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/'
    names = ['pokemon_species.csv', 'pokemon_species_names.csv', 'pokemon.csv', 'pokemon_types.csv', 'types.csv']
    bodies = [fetch(base + name, name, cache) for name in names]
    tables = {name: list(csv.DictReader(io.StringIO(body.decode()))) for name, body in zip(names, bodies)}
    english = {r['pokemon_species_id']: r['name'] for r in tables['pokemon_species_names.csv'] if r['local_language_id'] == '9'}
    types = {r['id']: r['identifier'] for r in tables['types.csv']}
    defaults = {r['species_id']: r['id'] for r in tables['pokemon.csv'] if r['is_default'] == '1'}
    memberships = {}
    for row in tables['pokemon_types.csv']:
        memberships.setdefault(row['pokemon_id'], []).append(types[row['type_id']])
    records = []
    for row in tables['pokemon_species.csv']:
        identity = row['id']
        if identity not in english or identity not in defaults:
            raise ValueError('Incomplete Pokemon species')
        aliases = [row['identifier']]
        if identity in ('29', '32'):
            aliases += ['Nidoran ' + ('female' if identity == '29' else 'male')]
        records.append({'id': 'pokemon:' + identity, 'label': english[identity], 'aliases': aliases,
            'source': 'https://pokeapi.co/api/v2/pokemon-species/' + identity + '/',
            'facts': {'type': memberships[defaults[identity]], 'generation': [row['generation_id']],
                      'legendary': [str(row['is_legendary'] == '1' or row['is_mythical'] == '1').lower()]}})
    save('pokeapi-pokemon', 'PokeAPI species, default-form types and generations', base, bodies, 'BSD-3-Clause', records, 1025)


def occupations(cache):
    base = 'https://www.onetcenter.org/dl_files/database/db_31_0_csv/'
    names = ['occupation_data.csv', 'job_titles.csv']
    bodies = [fetch(base + name, name, cache) for name in names]
    records = {}
    for row in csv.DictReader(io.StringIO(bodies[0].decode())):
        code = row['O*NET-SOC Code']
        records[code] = {'id': 'onet:' + code, 'label': row['Title'], 'aliases': set(),
            'source': 'https://www.onetonline.org/link/summary/' + code,
            'facts': {'group': [code[:2]]}}
    for row in csv.DictReader(io.StringIO(bodies[1].decode())):
        record = records.get(row['O*NET-SOC Code'])
        if record:
            record['aliases'].update(row[field] for field in ('Job Title', 'Short Title') if row[field] and len(row[field]) <= 100)
    for record in records.values():
        record['aliases'] = sorted(record['aliases'])
        if len(record['label']) > 100:
            if not record['aliases']:
                raise ValueError('Occupation has no playable title')
            record['label'] = min(record['aliases'], key=len)
    save('onet-occupations', 'O*NET 31.0 occupations and alternate job titles', 'https://www.onetcenter.org/database.html', bodies, 'CC-BY-4.0', list(records.values()), 1000)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('datasets', nargs='*', choices=['objects', 'vehicles', 'video-games', 'pokemon', 'occupations'])
    parser.add_argument('--from-cache', type=Path, help='Use previously captured raw responses for an offline normalization run')
    args = parser.parse_args()
    handlers = {'objects': objects, 'vehicles': vehicles, 'video-games': games, 'pokemon': pokemon, 'occupations': occupations}
    for selected in args.datasets or handlers:
        handlers[selected](args.from_cache)
