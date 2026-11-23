import client from "../api/client";

export const reconsiderationService = {
  async submit(payload) {
    const response = await client.post("/reconsiderations", payload);
    if (!response.data?.success || !response.data?.data?.id) {
      throw new Error("El servidor no confirmó la reconsideración.");
    }
    return response.data.data;
  },
  async listAssigned() {
    const response = await client.get("/reconsiderations/assigned");
    return response.data.data;
  },
  async decide(id, payload) {
    const response = await client.patch(`/reconsiderations/${id}/decision`, payload);
    return response.data.data;
  },
};
