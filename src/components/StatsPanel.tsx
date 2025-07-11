{/* Card 3: Distribution Platforms */}
<div className="flex flex-col items-center text-center bg-white rounded-2xl p-8">
  <div className="mb-4">
    <h3
      className="text-xl font-bold mb-2"
      style={{
        fontFamily: designTokens?.typography?.fontFamily,
        fontWeight: designTokens?.typography?.weights?.bold,
        color: designTokens?.colors?.gray?.[800] ?? '#333',
      }}
    >
      Our Distribution Platforms
    </h3>
    <p
      className="text-sm text-gray-500 max-w-xs mx-auto"
      style={{
        fontFamily: designTokens?.typography?.fontFamily,
        fontWeight: designTokens?.typography?.weights?.regular,
        letterSpacing: designTokens?.typography?.letterSpacings?.normal,
      }}
    >
      Delivering your content seamlessly across channels.
    </p>
  </div>
  
  <div className="mt-6 w-full max-w-lg mx-auto grid gap-4"
       style={{
         gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))',
       }}>
    {channels.map((channel, i) => (
      <span
        key={i}
        className="text-center px-4 py-2 rounded-full bg-gray-50 text-gray-700 text-sm font-medium transition hover:bg-gray-100"
        style={{
          fontFamily: designTokens?.typography?.fontFamily,
          fontWeight: designTokens?.typography?.weights?.regular,
          letterSpacing: designTokens?.typography?.letterSpacings?.wide,
        }}
      >
        {channel}
      </span>
    ))}
  </div>
</div>