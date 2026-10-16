// Materials bucket: private, owner-only, signed URLs that expire (spec section 12).
import { describe, expect, it } from 'vitest';
import { anonClient, localEnv, signedInUser } from '../helpers/local.ts';

describe('materials storage', () => {
  it('is not publicly readable', async () => {
    const owner = await signedInUser('storage-owner');
    const path = `${owner.id}/pitch_deck/deck.txt`;
    await owner.client.storage.from('materials').upload(path, new Blob(['private deck']));
    const res = await fetch(`${localEnv().API_URL}/storage/v1/object/public/materials/${path}`);
    expect(res.ok).toBe(false);
    const { data } = await anonClient().storage.from('materials').download(path);
    expect(data).toBeNull();
  });

  it('gives the owner a working signed URL, and refuses to sign for another founder', async () => {
    const owner = await signedInUser('storage-owner2');
    const other = await signedInUser('storage-other');
    const path = `${owner.id}/budget/budget.txt`;
    await owner.client.storage.from('materials').upload(path, new Blob(['private budget']));
    const signed = await owner.client.storage.from('materials').createSignedUrl(path, 60);
    expect(signed.error).toBeNull();
    const res = await fetch(signed.data!.signedUrl);
    expect(res.status).toBe(200);
    expect(await res.text()).toBe('private budget');
    const stolen = await other.client.storage.from('materials').createSignedUrl(path, 60);
    expect(stolen.data).toBeNull();
  });

  it('signed URLs stop working after they expire', async () => {
    const owner = await signedInUser('storage-expiry');
    const path = `${owner.id}/demo/demo.txt`;
    await owner.client.storage.from('materials').upload(path, new Blob(['demo']));
    const signed = await owner.client.storage.from('materials').createSignedUrl(path, 1);
    await new Promise((r) => setTimeout(r, 2500));
    const res = await fetch(signed.data!.signedUrl);
    expect(res.ok).toBe(false);
  });
});
