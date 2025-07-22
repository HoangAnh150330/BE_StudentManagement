import bcrypt from 'bcrypt';

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (input: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(input, hash);
};
