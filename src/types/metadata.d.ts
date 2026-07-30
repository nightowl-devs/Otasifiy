type Metadata = {
  fileMetadata: {
    ios: FileMetadata;
    android: FileMetadata;
  };
};

type FileMetadata = {
  bundle: string;
  assets: {
    path: string;
    extension: string;
  }[];
};
